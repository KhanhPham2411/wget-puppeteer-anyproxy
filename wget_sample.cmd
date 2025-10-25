
REM git bash: ./wget_youtube.sh

REM proxy config
REM -e http_proxy=127.0.0.1:8001
REM -e https_proxy=127.0.0.1:8001

REM common recursive config
REM --mirror --no-parent
REM --reject-regex "logout|language"

npm run clean && wget -p -k --html-extension --mirror --no-parent --no-check-certificate --load-cookies cookies.txt -P output -e use_proxy=on -e http_proxy=127.0.0.1:8001 -e https_proxy=127.0.0.1:8001 https://docs.developers.optimizely.com/feature-experimentation/



