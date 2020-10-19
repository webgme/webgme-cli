# Argument Completion for Bash/Zsh

Enable argument completion for the webgme-setup-tool by executing the following in your bash session:

```
. ./extra/webgme.completion.bash
```

You can add it to your `~/.bashrc` to enable it for subsequent bash session. This can be done by executing the following from the root of your webgme-setup-tool installation:

```
echo ". $(pwd)/extra/webgme.completion.bash" >> ~/.bashrc
```

or for zsh

```
echo ". $(pwd)/extra/webgme.completion.bash" >> ~/.zshrc
```

The completion script can be updated at any time by running

```
npm run build-completion
```
