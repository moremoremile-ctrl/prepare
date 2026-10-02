# Prepare

React + TypeScript と Python + FastAPI の最小開発環境です。画面のボタンから `GET /api/health` を呼び出し、待機・読み込み・成功・失敗を表示します。認証・データベース・CI は含みません。

## 前提

- Windows / PowerShell、Git、VS Code
- Node.js **24.13.1**、npm **11.8.0**（`.node-version` と `package.json` に固定）
- Python **3.14.3**（`.python-version` に固定、パッケージは Python 3.14 系に対応）
- uv **0.10.9**（下記の専用環境にインストール。既に導入済みなら同じバージョンを使用）

Vite の [Node.js 要件](https://vite.dev/guide/)に対応するランタイムを使用しています。[uv の導入方法](https://docs.astral.sh/uv/getting-started/installation/)と [FastAPI の起動方法](https://fastapi.tiangolo.com/deployment/manually/)も参照できます。

## 初回セットアップ

リポジトリのルートで実行します。Python / Node.js を上記バージョンで導入しておいてください。

```powershell
python -m venv .tools
.tools\Scripts\python -m pip install uv==0.10.9
npm ci
npm run setup
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
npm run hooks:install
```

既存の `.env` がある場合、コピーは省略してください。`.tools`、`backend/.venv`、本物の `.env` は Git 管理対象外です。npm はルートの `package-lock.json`、Python は `backend/uv.lock` からインストールします。フロントエンドの依存関係もルートの npm workspace が管理します。

コマンドは `.tools` の uv を優先し、なければ PATH 上の uv を使います。任意の uv 実行ファイルを使う場合は `$env:UV` にパスを指定してください。

macOS / Linux では専用 uv の導入を `python3 -m venv .tools` と `.tools/bin/python -m pip install uv==0.10.9` に置き換え、環境ファイルは `cp` でコピーします。以降の npm コマンドは共通です。

## 起動

```powershell
npm run dev
```

フロントエンドとバックエンドを同時に起動します。停止は `Ctrl+C`。個別に起動する場合は、別々のターミナルで以下を実行します。

```powershell
npm run dev:frontend
npm run dev:backend
```

- 画面: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000/api/health>
- API ドキュメント: <http://127.0.0.1:8000/docs>

画面の「API に接続する」を押すと接続成功を表示します。API を停止して再度押すと失敗を表示し、再試行できます。読み込み中はボタンを無効にし、5 秒でタイムアウトします。

ブラウザは相対 URL `/api/health` を呼び出し、Vite の開発用プロキシが API に転送します。開発中の CORS 設定は不要です。本番環境では `frontend/dist/` を配信し、同一オリジンの `/api` をバックエンドへ転送するリバースプロキシ等を別途設定してください。Vite preview は API プロキシを提供しません。

## 環境変数

| ファイル        | 変数               | 初期値・用途                                                                       |
| --------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `frontend/.env` | `API_PROXY_TARGET` | `http://127.0.0.1:8000`。Vite 開発用プロキシの転送先。ブラウザには公開されません。 |
| `backend/.env`  | `APP_NAME`         | `Prepare API`。API ドキュメントの表示名。起動コマンドが `.env` を読み込みます。    |

どちらもサンプル値は秘密情報ではありません。変更後はサーバーを再起動してください。ホスト・ポートは共有起動コマンドに固定しています。

## チェック・テスト・ビルド

すべてルートから実行します。

| コマンド                | 内容                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `npm run format`        | Prettier / Ruff で整形し、Ruff の自動修正を適用。ファイルを書き換えます。                   |
| `npm run format:check`  | 整形状態を検査。書き換えません。                                                            |
| `npm run lint`          | ESLint / Ruff による静的解析                                                                |
| `npm run typecheck`     | TypeScript / mypy による型チェック                                                          |
| `npm test`              | Vitest の UI テストと pytest の API テスト                                                  |
| `npm run build`         | フロントエンドのビルド、Python の sdist / wheel 作成、隔離環境への wheel インストールと検証 |
| `npm run check`         | 整形チェック・静的解析・型チェック。テストとビルドは省略。                                  |
| `npm run verify`        | 整形チェック・静的解析・型チェック・テスト・ビルドを順に実行                                |
| `npm run hooks:install` | この clone に pre-commit フックを登録                                                       |
| `npm run hooks:check`   | Git 管理対象ファイルでフックを実行                                                          |

整形後は差分を確認し、必要な変更をステージしてからチェックを再実行してください。整形が実行できたことだけでは、チェック成功とはみなしません。

ビルド成果物は `frontend/dist/` と `backend/dist/` に生成されます。Python は `python -m build` で sdist と wheel を作成し、内容を確認したうえで一時仮想環境へ wheel をインストールします。ソースツリー外で `python -I` を使い、インポート元・ヘルス応答・OpenAPI を検証します。一時環境は自動削除します。この検証にはビルド依存と wheel 依存を取得するネットワーク接続が必要です。

pre-commit はステージ済みの対象ファイルに対して、固定されたツールと共通設定で整形・静的解析のみを実行します。整形がファイルを変更した場合はコミットを停止するので、差分を確認して再ステージし、コミットを再試行してください。フックは自動ステージをしません。テスト・型チェック・ビルドはフックに含めていません。

CI は今回の構成では無効です。手元で `npm run verify` を実行してください。

## VS Code

推奨拡張機能を `.vscode/extensions.json` に記載しています。初回セットアップ後、`Python: Select Interpreter` から `backend/.venv/Scripts/python.exe` を選択してください（macOS / Linux は `backend/.venv/bin/python`）。保存時に言語ごとのフォーマッターが動きます。

- `Tasks: Run Task` → `Development: start both` で両サーバーを起動できます。
- `Frontend: start` / `Backend: start` は個別起動用タスクです。
- `Checks: fast` / `Checks: full` / `Format` / `Tests` / `Build` で共通コマンドを実行できます。
- F5 → `Frontend: Edge` で Edge を起動し、React にブレークポイントを置けます。API は別タスクで起動してください。
- F5 → `Backend: FastAPI` で Python をデバッグできます。既に起動中の API は先に停止してください。
- `Frontend + Backend` で両方のデバッガーを起動できます。API の起動完了後に画面でボタンを押してください。

Edge は VS Code の組み込みブラウザデバッガーを使用し、Python は Python / Python Debugger 拡張を使用します。デバッグ時は API の自動再読み込みを無効にしています。

## 構成

```text
frontend/             React・Vite・UI テスト
backend/              FastAPI・API テスト・pyproject.toml・uv.lock
scripts/              共通コマンド・Python ビルド検証
.vscode/              推奨拡張・設定・起動タスク・デバッグ
.pre-commit-config.yaml
package.json          共通コマンド・npm workspaces
package-lock.json     npm 依存関係の固定
```

既存の `.agent/skills/empty-repo-bootstrap/` は保持しています。
