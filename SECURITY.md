# Security Policy

## Secret Storage

TON Graph stores the TONcenter API key exclusively using VS Code's `ExtensionContext.secrets` API.
The implementation in [src/secrets/tokenManager.ts](src/secrets/tokenManager.ts)
invokes `context.secrets.get`, `context.secrets.store`, and `context.secrets.delete` to
retrieve, save, and remove the key. VS Code encrypts these secrets on disk, so no
API keys are written to the extension's configuration files or logs.
