"use strict";
// anyproxy --rule ./bin/puppeteer_anyproxy_rulev3.js --intercept
Object.defineProperty(exports, "__esModule", { value: true });
exports.browser = void 0;
const puppeteer = require("puppeteer");
const setupBrowser = async () => {
    return puppeteer
        .launch({ headless: true, ignoreHTTPSErrors: true, defaultViewport: null,
        args: ['--start-maximized']
    })
        .then(builtBrowser => {
        exports.browser = builtBrowser;
        exports.browser.on('disconnected', setupBrowser);
    });
};
setupBrowser();
process.on('SIGINT', () => {
    exports.browser.close();
});
// Build an Anyproxy module following its specification.
module.exports = {
    summary: 'Puppeteer rules for anyproxy',
    *beforeSendRequest(requestDetail) {
        const { url, requestOptions: { path, hostname }, protocol, } = requestDetail;
        if (new RegExp(`/https?:\/\/.*@${hostname}`).test(url)) {
            return {
                response: {
                    statusCode: 404,
                    header: { 'content-type': 'text/html' },
                    body: '',
                },
            };
        }
        return null;
    },
    *beforeSendResponse(requestDetail, responseDetail) {
        const { url, requestOptions: { path, hostname }, protocol, } = requestDetail;
        const { 'Content-Type': contentType = '' } = responseDetail.response.header;
        if (contentType.split(';')[0] === 'text/html') {
            const html = responseDetail.response.body.toString('utf8');
            return exports.browser
                .newPage()
                .then(async (page) => {
                const cookies = responseDetail.response.header["Set-Cookie"];
                const formatedCookies = cookies.map((item) => {
                    const [name, value] = item.replace(";", "").replace(" expires", "").split("=");
                    return {
                        name,
                        value,
                        domain: hostname,
                    };
                });
                await page.setCookie(...formatedCookies);
                await page.goto(url, { waitUntil: "networkidle0" });
                // await evaluateToMinimizeLinkList(page);
                const newResponse = responseDetail.response;
                newResponse.body = await page.content();
                await page.close();
                return {
                    response: newResponse,
                };
            })
                .catch(err => {
                console.log('Failed to render url', url, err);
            });
        }
        return null;
    },
    *onError(requestDetail, error) {
        console.log('onError: ', requestDetail, error);
    },
    *onConnectError(requestDetail, error) {
        console.log('onConnectError: ', requestDetail, error);
    },
};
async function evaluateToMinimizeLinkList(page) {
    return await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        var compareDomPath = function (el1, el2, stopSign = "") {
            var domPath1 = getDomPath(el1);
            var domPath2 = getDomPath(el2);
            if (domPath1.length !== domPath2.length)
                return false;
            for (var index = domPath1.length - 1; index >= 0; index--) {
                if (domPath1[index].indexOf(stopSign) > -1)
                    return true;
                if (domPath1[index] !== domPath2[index]) {
                    return false;
                }
            }
            return true;
        };
        var getDomPath = function (el) {
            var stack = [];
            while (el.parentNode != null) {
                var sibCount = 0;
                var sibIndex = 0;
                for (var i = 0; i < el.parentNode.childNodes.length; i++) {
                    var sib = el.parentNode.childNodes[i];
                    if (sib.nodeName == el.nodeName) {
                        if (sib === el) {
                            sibIndex = sibCount;
                        }
                        sibCount++;
                    }
                }
                if (el.hasAttribute('id') && el.id != '') {
                    stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
                }
                else if (sibCount > 1 && sibIndex > 0) {
                    stack.unshift(el.nodeName.toLowerCase() + ':eq(' + sibIndex + ')');
                }
                else {
                    stack.unshift(el.nodeName.toLowerCase());
                }
                el = el.parentNode;
            }
            return stack.slice(1); // removes the html element
        };
        var tr_list = document.querySelectorAll("tbody > tr");
        if (tr_list.length == 0)
            return;
        var tr_first_a = tr_list[0].querySelectorAll("a");
        if (!tr_first_a)
            return;
        if (tr_first_a.length == 0)
            return;
        tr_list.forEach((item) => {
            var item_a = item.querySelectorAll("a");
            item_a.forEach((a_tag_source) => {
                tr_first_a.forEach((a_tag_target) => {
                    if (!a_tag_target || !a_tag_source)
                        return;
                    if (a_tag_target.href === "#" || a_tag_source.href === "#")
                        return;
                    if (a_tag_target.href.indexOf("javascript") > -1 || a_tag_source.href.indexOf("javascript") > -1)
                        return;
                    var result = compareDomPath(a_tag_source, a_tag_target, "tr");
                    if (result) {
                        a_tag_source.href = a_tag_target.href;
                    }
                });
            });
        });
    });
}
//# sourceMappingURL=puppeteer_anyproxy_rule.js.map