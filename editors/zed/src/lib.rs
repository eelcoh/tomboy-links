use zed_extension_api::{self as zed, Result};

struct TomboyLinksExtension;

impl zed::Extension for TomboyLinksExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let env = worktree.shell_env();

        if let Some(path) = env_value(&env, "TOMBOY_LINKS_LSP_PATH") {
            return node_command(path, env);
        }

        if let Some(path) = worktree.which("tomboy-links-lsp") {
            return Ok(zed::Command {
                command: path,
                args: Vec::new(),
                env,
            });
        }

        let local_script = format!(
            "{}/lsp/server.js",
            worktree.root_path().trim_end_matches('/')
        );
        if worktree.read_text_file("lsp/server.js").is_ok() {
            return node_command(local_script, env);
        }

        Err("Could not find Tomboy Links language server. Set TOMBOY_LINKS_LSP_PATH to lsp/server.js or put tomboy-links-lsp on PATH.".to_string())
    }
}

fn node_command(script_path: String, env: zed::EnvVars) -> Result<zed::Command> {
    Ok(zed::Command {
        command: zed::node_binary_path()?,
        args: vec![script_path],
        env,
    })
}

fn env_value(env: &zed::EnvVars, name: &str) -> Option<String> {
    env.iter()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.clone())
        .filter(|value| !value.is_empty())
}

zed::register_extension!(TomboyLinksExtension);
