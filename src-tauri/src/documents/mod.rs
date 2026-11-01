//! Camada de documentos do Mark-Lee.
//!
//! **Por que diretório e não `persistence.rs` solto:** o plano ML-H02 pede um
//! primitivo único de gravação e as entregas seguintes têm este diretório como
//! destino declarado (ML-H03 sessão de documento, ML-H05 conflito/recuperação,
//! ML-H07 histórico). Criar o diretório agora evita renomear caminho público
//! depois.
//!
//! - `persistence` — gravação segura de documento e de criação exclusiva.
//! - `drafts` — rascunhos duráveis fora do workspace (recuperação após crash).

pub mod drafts;
pub mod persistence;

pub use persistence::{
    create_new, create_new_with, safe_write, safe_write_with, SafeWriteError, SafeWriteFailureKind,
    SafeWriteOutcome,
};
