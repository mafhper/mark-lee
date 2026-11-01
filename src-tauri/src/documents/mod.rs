//! Camada de documentos do Mark-Lee.
//!
//! **Por que diretório e não `persistence.rs` solto:** o plano ML-H02 pede um
//! primitivo único de gravação e as entregas seguintes têm este diretório como
//! destino declarado (ML-H03 sessão de documento, ML-H05 conflito/recuperação,
//! ML-H07 histórico). Criar o diretório agora evita renomear caminho público
//! depois; por enquanto só `persistence` mora aqui.

pub mod persistence;

pub use persistence::{
    safe_write, safe_write_with, SafeWriteError, SafeWriteFailureKind, SafeWriteOutcome,
};
