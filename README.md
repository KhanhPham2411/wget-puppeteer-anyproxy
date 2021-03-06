
# wget-puppeteer-anyproxy

This repo is an Open Source Software maintained by one developer in free time. If you want to thank the author of this module you can use 
[Patreon](https://www.patreon.com/Kapa2411) or [buymeacoffee](https://www.buymeacoffee.com/Kapa2411)



## Installation
```sh
npm install
```
```sh
npm install -g anyproxy
```

## Usage
Powershell:
```sh
anyproxy --rule ./bin/puppeteer_anyproxy_rule.js --intercept
```
Git bash:
```sh
./wget_youtube.sh
```
![alt text](https://i.imgur.com/79BUBTY.png)

Here is the result:
![alt text](https://i.imgur.com/fQnZm7l.png)

For comparing without using our tool:
![alt text](https://i.imgur.com/mgO1U0M.png)


## How it works
It starts Chromium in headless mode which just opens page and waits until page is loaded.
For logging in context, you can refer to cookies.txt file to generate them.
