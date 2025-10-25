
REM git bash: ./wget_youtube.sh

REM proxy config
REM -e http_proxy=127.0.0.1:8001
REM -e https_proxy=127.0.0.1:8001

REM common recursive config
REM --mirror --no-parent
REM --reject-regex "logout|language"

wget -p -k --html-extension --load-cookies cookies.txt -e use_proxy=on -e http_proxy=127.0.0.1:8001 -e https_proxy=127.0.0.1:8001 https://www.youtube.com/watch?v=0-q1KafFCLU



