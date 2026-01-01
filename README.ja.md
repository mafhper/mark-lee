# Mark-Lee

<p align="center">
  <img src="assets/logo.svg" alt="Mark-Lee Logo" width="120" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.pt-BR.md">Portugues</a> |
  <a href="README.es.md">Espanol</a> |
  <a href="README.fr.md">Francais</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.zh.md">中文</a>
</p>

Mark-Lee は、パフォーマンスと集中力のために設計されたデスクトップ Markdown エディターです。Tauri フレームワークを通じて、モダンな Web 技術とネイティブ OS 機能を組み合わせています。リアルタイムプレビューレンダリングと堅牢なファイル管理機能を備えた、集中できる執筆環境を提供します。

![App Screenshot](assets/screen.jpg)

## 機能

- **禅モード** - マウスを動かすのをやめると UI が消える
- **フォーカスモード** - アクティブな段落のみをハイライトするスポットライト効果
- **同期スクロール** - エディターとプレビューが一緒に動く
- **プロフェッショナル PDF エクスポート** - 印刷用のクリーンなタイポグラフィを備えた A4 レイアウト
- **9 種類のテーマ** - ライト、ダーク、ミッドナイト、セピア、Nord、Synthwave、Forest、Coffee、Terminal
- **生産性ツール** - 自動保存、読書時間、カスタムショートカット
- **軽量** - 約 3MB のインストーラー、低メモリフットプリント
- **クロスプラットフォーム** - Windows、macOS、Linux

## 技術アーキテクチャ

アプリケーションは、Web 開発エコシステムを活用しながら、ネイティブアプリケーションのパフォーマンスとシステムアクセスを維持するハイブリッドアーキテクチャで構築されています。

*   **フロントエンドコア**: **React 19** と **TypeScript** で構築され、型安全性とコンポーネントのモジュール性を確保。
*   **ビルドツール**: **Vite 7** を使用して高速な HMR（ホットモジュールリプレースメント）と最適化された本番バンドルを実現。
*   **スタイリングエンジン**: **TailwindCSS 3** によるユーティリティファーストスタイリングを PostCSS 経由で処理。
*   **デスクトップランタイム**: **Tauri 2 (Rust)** で駆動。このレイヤーはウィンドウ管理、ファイルシステム IO、ネイティブダイアログを処理し、Electron ベースの代替品と比較して大幅に小さいバイナリサイズと低メモリフットプリントを実現。

## プロジェクト構造

```
mark-lee/
├── src/                    # React フロントエンドソースコード
│   ├── App.tsx            # コアエディターコンポーネント
│   ├── components/        # 再利用可能な UI 要素
│   └── services/          # ファイルシステム操作
├── src-tauri/             # Rust バックエンド
│   ├── tauri.conf.json    # ネイティブウィンドウ設定
│   └── src/               # Rust ソースファイル
├── scripts/               # Node.js 自動化スクリプト
└── .github/workflows/     # CI/CD 定義
```

## はじめに

### 前提条件

セットアップスクリプトを実行することで、ほとんどの要件を自動的に確認およびインストールできます：
```bash
npm run setup
```

**手動要件：**
*   Node.js (v18+)
*   Rust（最新の安定版）
*   **Windows ユーザー**: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（「C++ によるデスクトップ開発」）。

### 開発

1.  **インストール**:
    ```bash
    npm install
    npm run setup  # システム要件を確認/インストール
    ```
2.  **ローカル開発（Web）**:
    ```bash
    npm run dev
    ```
    Web インターフェース用の Vite 開発サーバーを起動します。

3.  **ローカル開発（デスクトップ）**:
    ```bash
    npm run tauri dev
    ```
    ネイティブ Tauri ウィンドウでアプリケーションを起動します。

### ビルドとリリース

本番用にローカルでアプリケーションをコンパイルするには：

```bash
npm run tauri build
```

ビルドプロセスは Vite 経由で React アセットをコンパイルし、Rust バイナリに埋め込みます。最終的な実行ファイルは `src-tauri/target/release/` に出力されます。

## ライセンス

このプロジェクトはオープンソースであり、MIT ライセンスの下で利用可能です。

---

<p align="center">

```
                          書く。集中する。創造する。
```

</p>
