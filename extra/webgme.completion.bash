_webgme()
{
    local cur=${COMP_WORDS[COMP_CWORD]}

	if [[ "${COMP_WORDS[0]}" == "webgme" ]]; then
		COMPREPLY=( $(compgen -W "start init disable enable rm ls new add" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "disable" ]]; then
		COMPREPLY=( $(compgen -W "viz plugin layout decorator addon" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "enable" ]]; then
		COMPREPLY=( $(compgen -W "viz plugin layout decorator addon" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "rm" ]]; then
		COMPREPLY=( $(compgen -W "addon decorator layout plugin seed viz" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "new" ]]; then
		COMPREPLY=( $(compgen -W "viz seed plugin layout decorator addon" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "add" ]]; then
		COMPREPLY=( $(compgen -W "viz seed plugin layout decorator addon" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "new" && "${COMP_WORDS[2]}" == "viz" ]]; then
		COMPREPLY=( $(compgen -W "--name --secondary" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "new" && "${COMP_WORDS[2]}" == "seed" ]]; then
		COMPREPLY=( $(compgen -W "--seed-name --source" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "new" && "${COMP_WORDS[2]}" == "plugin" ]]; then
		COMPREPLY=( $(compgen -W "--config-structure --template-type --no-test --description --plugin-name" -- $cur) )
	fi
	if [[ "${COMP_WORDS[0]}" == "webgme" && "${COMP_WORDS[1]}" == "new" && "${COMP_WORDS[2]}" == "addon" ]]; then
		COMPREPLY=( $(compgen -W "--description --name" -- $cur) )
	fi


}
complete -F _webgme webgme
