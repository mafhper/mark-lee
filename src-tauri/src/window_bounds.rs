//! Guarda de geometria da janela restaurada.
//!
//! O `tauri-plugin-window-state` grava `inner_size()` (área de cliente, em
//! pixels físicos) e `outer_position()`, e repõe os dois em `on_window_ready`
//! **antes** de mostrar a janela, sem consultar a área de trabalho do monitor.
//! Nessa ordem o `set_size` não é fiel: medido nesta máquina (2560x1440, 100%
//! de escala, área de trabalho de 1408 de altura) o cliente volta 30 px mais
//! alto que o salvo — 792 vira 822 e 1406 vira 1436. Uma janela salva com a
//! altura da área de trabalho (o caso de quem encaixa com Aero Snap) reabre
//! com a base 30 px sob a barra de tarefas; e como a geometria viva é salva de
//! novo na saída, a altura cresce 30 px a cada abertura.
//!
//! Este módulo roda **depois** do restore do plugin (mesma ordem de registro)
//! e, já com a janela visível — onde o `set_size` é exato, também medido —
//! ajusta a janela à área de trabalho do monitor em que ela foi restaurada:
//! encolhe o que não couber, reposiciona o que estiver fora e centraliza no
//! primário quando o monitor salvo não existe mais. Janela maximizada ou em
//! tela cheia não é tocada, e geometria que já cabe permanece byte a byte
//! igual.

use tauri::{PhysicalPosition, PhysicalSize, Runtime, Window};

/// Retângulo em pixels físicos, na convenção do Windows: `x`/`y` são o canto
/// superior esquerdo, `width`/`height` o tamanho.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Bounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Bounds {
    pub const fn new(x: i32, y: i32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    fn right(&self) -> i64 {
        self.x as i64 + self.width as i64
    }

    fn bottom(&self) -> i64 {
        self.y as i64 + self.height as i64
    }

    /// Área da interseção com `other`, em pixels. `0` quando não há contato.
    pub fn intersection_area(&self, other: &Bounds) -> u64 {
        let width = (self.right().min(other.right()) - (self.x.max(other.x) as i64)).max(0);
        let height = (self.bottom().min(other.bottom()) - (self.y.max(other.y) as i64)).max(0);
        width as u64 * height as u64
    }
}

/// Geometria lida da janela no momento do ajuste.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Geometry {
    /// Retângulo externo: o que o plugin usa para posição.
    pub outer: Bounds,
    /// Tamanho interno atual: o que o plugin usa para tamanho.
    pub inner_width: u32,
    pub inner_height: u32,
}

/// O que aplicar na janela. Tamanho é interno (`set_size` do Tauri pousa em
/// `set_inner_size`), posição é externa (`set_position`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Plan {
    pub x: i32,
    pub y: i32,
    pub inner_width: u32,
    pub inner_height: u32,
}

/// Decide o ajuste. `work_areas` deve trazer a área de trabalho do monitor
/// primário em primeiro lugar, para servir de destino quando o monitor salvo
/// não existe mais.
///
/// Devolve `None` quando nada precisa mudar — é o caso que não pode nem
/// arredondar a geometria salva.
pub fn plan(geometry: Geometry, work_areas: &[Bounds], allow_shrink: bool) -> Option<Plan> {
    let work = pick_work_area(geometry.outer, work_areas)?;

    let mut outer = geometry.outer;
    // Sem contato com nenhuma área de trabalho, o monitor salvo (ou a posição
    // salva) não existe mais: centraliza no primário antes de ajustar.
    if !work.touches_window {
        outer.x = work.bounds.x + ((work.bounds.width as i64 - outer.width as i64) / 2) as i32;
        outer.y = work.bounds.y + ((work.bounds.height as i64 - outer.height as i64) / 2) as i32;
    }

    if allow_shrink {
        outer.width = outer.width.min(work.bounds.width);
        outer.height = outer.height.min(work.bounds.height);
    }

    let max_x = work.bounds.right() - outer.width as i64;
    let max_y = work.bounds.bottom() - outer.height as i64;
    let min_x = work.bounds.x as i64;
    let min_y = work.bounds.y as i64;
    outer.x = (outer.x as i64).clamp(min_x, max_x.max(min_x)) as i32;
    outer.y = (outer.y as i64).clamp(min_y, max_y.max(min_y)) as i32;

    // O plugin salva tamanho interno e posição externa; para chegar no
    // retângulo externo desejado é preciso descontar a moldura medida agora.
    let frame_width = geometry.outer.width.saturating_sub(geometry.inner_width);
    let frame_height = geometry.outer.height.saturating_sub(geometry.inner_height);
    let inner_width = outer.width.saturating_sub(frame_width).max(1);
    let inner_height = outer.height.saturating_sub(frame_height).max(1);

    if outer.x == geometry.outer.x
        && outer.y == geometry.outer.y
        && inner_width == geometry.inner_width
        && inner_height == geometry.inner_height
    {
        return None;
    }

    Some(Plan {
        x: outer.x,
        y: outer.y,
        inner_width,
        inner_height,
    })
}

struct PickedWorkArea {
    bounds: Bounds,
    /// A janela encosta nesta área de trabalho (ou em alguma outra).
    touches_window: bool,
}

/// A área de trabalho do monitor onde a janela está de fato. Empate é resolvido
/// pela ordem recebida — por isso o primário vem primeiro.
fn pick_work_area(window: Bounds, work_areas: &[Bounds]) -> Option<PickedWorkArea> {
    let mut best: Option<(usize, u64)> = None;
    for (index, area) in work_areas.iter().enumerate() {
        if area.width == 0 || area.height == 0 {
            continue;
        }
        let area_overlap = window.intersection_area(area);
        if area_overlap == 0 {
            continue;
        }
        if best.map_or(true, |(_, best_overlap)| area_overlap > best_overlap) {
            best = Some((index, area_overlap));
        }
    }

    match best {
        Some((index, _)) => Some(PickedWorkArea {
            bounds: work_areas[index],
            touches_window: true,
        }),
        None => work_areas
            .iter()
            .find(|area| area.width > 0 && area.height > 0)
            .map(|area| PickedWorkArea {
                bounds: *area,
                touches_window: false,
            }),
    }
}

/// Ajusta a janela à área de trabalho. Silencioso por desenho: qualquer falha
/// de leitura deixa a janela como está, porque ficar com a geometria salva é
/// melhor do que desaparecer.
pub fn apply<R: Runtime>(window: &Window<R>) {
    if window.is_maximized().unwrap_or(false)
        || window.is_fullscreen().unwrap_or(false)
        || window.is_minimized().unwrap_or(false)
    {
        return;
    }

    let (Ok(position), Ok(outer_size), Ok(inner_size)) = (
        window.outer_position(),
        window.outer_size(),
        window.inner_size(),
    ) else {
        return;
    };

    let geometry = Geometry {
        outer: Bounds::new(position.x, position.y, outer_size.width, outer_size.height),
        inner_width: inner_size.width,
        inner_height: inner_size.height,
    };

    let Some(adjustment) = plan(
        geometry,
        &work_areas(window),
        window.is_resizable().unwrap_or(true),
    ) else {
        return;
    };

    let _ = window.set_size(PhysicalSize::new(
        adjustment.inner_width,
        adjustment.inner_height,
    ));
    let _ = window.set_position(PhysicalPosition::new(adjustment.x, adjustment.y));
}

fn work_areas<R: Runtime>(window: &Window<R>) -> Vec<Bounds> {
    let mut areas = Vec::new();
    if let Some(primary) = window.primary_monitor().ok().flatten() {
        areas.push(bounds_of(primary.work_area()));
    }
    if let Ok(monitors) = window.available_monitors() {
        for monitor in monitors {
            let area = bounds_of(monitor.work_area());
            if !areas.contains(&area) {
                areas.push(area);
            }
        }
    }
    areas
}

fn bounds_of(area: &tauri::PhysicalRect<i32, u32>) -> Bounds {
    Bounds::new(
        area.position.x,
        area.position.y,
        area.size.width,
        area.size.height,
    )
}

/// Plugin da guarda. Precisa ser registrado **depois** do
/// `tauri-plugin-window-state`: os hooks `on_window_ready` de plugins rodam na
/// ordem de registro, e esta guarda só faz sentido sobre a geometria que o
/// restore já aplicou.
pub fn plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("window-bounds-guard")
        .on_window_ready(|window| apply(&window))
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Tela medida nesta máquina, 100% de escala: 2560x1440 com barra de
    /// tarefas de 32 px, logo área de trabalho 2560x1408.
    const WORK_PRIMARY: Bounds = Bounds::new(0, 0, 2560, 1408);
    /// Segunda tela de 1920x1080 cujo work area perde 40 px para a barra.
    const WORK_SECONDARY: Bounds = Bounds::new(2560, 0, 1920, 1040);

    fn geometry(outer: Bounds, inner_width: u32, inner_height: u32) -> Geometry {
        Geometry {
            outer,
            inner_width,
            inner_height,
        }
    }

    #[test]
    fn geometry_that_already_fits_is_untouched() {
        let current = geometry(Bounds::new(120, 90, 1200, 800), 1184, 792);
        assert_eq!(plan(current, &[WORK_PRIMARY], true), None);
    }

    #[test]
    fn window_taller_than_work_area_is_shrunk_and_kept_inside() {
        // Área de trabalho de 1080 de altura e estado salvo de 1200: cabe?
        let work = Bounds::new(0, 0, 1920, 1080);
        let saved = geometry(Bounds::new(0, 0, 1280, 1200), 1264, 1184);

        let plan = plan(saved, &[work], true).expect("precisa ajustar");
        assert_eq!(plan.inner_height, 1080 - 16);
        assert_eq!(plan.y, 0);
        assert!(plan.y as i64 + (plan.inner_height + 16) as i64 <= work.bottom());
        assert_eq!(plan.x, 0);
        assert_eq!(plan.inner_width, 1264);
    }

    #[test]
    fn window_hanging_below_the_taskbar_is_pushed_up() {
        let current = geometry(Bounds::new(0, 500, 1280, 1000), 1264, 984);
        let plan = plan(current, &[WORK_PRIMARY], true).expect("precisa ajustar");

        assert_eq!(plan.y, 1408 - 1000);
        assert_eq!(plan.inner_height, 984);
        assert_eq!(plan.x, 0);
    }

    #[test]
    fn snapped_left_state_from_a_real_session_stays_inside_the_work_area() {
        // Sessão real com a janela encaixada à esquerda: o plugin salvou
        // x=-7, y=0 e cliente 1278x1406. Ao reabrir, o restore inflado deixou
        // externo (-7,0) 1294x1445 e cliente 1278x1436 — base 37 px abaixo da
        // área de trabalho. O ajuste tem de trazer a janela inteira para
        // dentro dela.
        let saved = geometry(Bounds::new(-7, 0, 1294, 1445), 1278, 1436);

        let plan = plan(saved, &[WORK_PRIMARY], true).expect("precisa ajustar");
        let outer_height = plan.inner_height + (saved.outer.height - saved.inner_height);
        let outer_width = plan.inner_width + (saved.outer.width - saved.inner_width);

        assert!(plan.y as i64 + outer_height as i64 <= WORK_PRIMARY.bottom());
        assert!(plan.x >= WORK_PRIMARY.x);
        assert!(plan.x as i64 + outer_width as i64 <= WORK_PRIMARY.right());
    }

    #[test]
    fn window_restored_on_secondary_monitor_keeps_its_monitor() {
        let current = geometry(Bounds::new(3200, 40, 1000, 900), 984, 892);
        let pick = pick_work_area(current.outer, &[WORK_PRIMARY, WORK_SECONDARY]).unwrap();
        assert_eq!(pick.bounds, WORK_SECONDARY);
    }

    #[test]
    fn window_without_any_monitor_is_centered_on_the_primary() {
        // Monitor salvo não existe mais: retângulo totalmente fora do desktop.
        let lost = geometry(Bounds::new(5000, 120, 1200, 900), 1184, 892);
        let plan = plan(lost, &[WORK_PRIMARY, WORK_SECONDARY], true).expect("precisa ajustar");

        assert_eq!(plan.x, (WORK_PRIMARY.width - 1200) as i32 / 2);
        assert_eq!(plan.y, (WORK_PRIMARY.height - 900) as i32 / 2);
    }

    #[test]
    fn monitor_without_work_area_keeps_the_window_untouched() {
        let current = geometry(Bounds::new(10, 10, 800, 600), 800, 600);
        assert_eq!(plan(current, &[], true), None);
        let degenerate = Bounds::new(0, 0, 0, 0);
        assert_eq!(plan(current, &[degenerate], true), None);
    }

    #[test]
    fn non_resizable_window_only_moves() {
        let current = geometry(Bounds::new(0, 400, 1280, 1200), 1280, 1200);
        let plan = plan(current, &[WORK_PRIMARY], false).expect("precisa mover");

        assert_eq!(plan.inner_height, 1200, "tamanho não pode mudar");
        assert_eq!(plan.inner_width, 1280);
        assert_eq!(plan.y, WORK_PRIMARY.height as i32 - 1200);
    }

    #[test]
    fn zero_sized_work_area_is_ignored() {
        let empty = Bounds::new(0, 0, 0, 0);
        let current = geometry(Bounds::new(0, 0, 800, 600), 800, 600);
        assert_eq!(plan(current, &[empty, WORK_PRIMARY], true), None);
    }
}
