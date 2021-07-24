
# git bash: ./wget_youtube.sh

  # proxy config
    # -e http_proxy=127.0.0.1:8001 \
    # -e https_proxy=127.0.0.1:8001 \

  # common recursive config
    # --mirror --no-parent 
    # --reject-regex "logout|language"

wget -p -k --html-extension \
  --load-cookies cookies.txt \
  -e use_proxy=on \
  -e http_proxy=127.0.0.1:8001 \
  -e https_proxy=127.0.0.1:8001 \
    https://www.youtube.com/watch?v=0-q1KafFCLU



