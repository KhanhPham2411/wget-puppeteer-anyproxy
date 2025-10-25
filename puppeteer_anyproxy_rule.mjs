// anyproxy --rule ./bin/puppeteer_anyproxy_rule.mjs --intercept

import puppeteer from "puppeteer";

// Spin up a browser in the background
export let browser;
const setupBrowser = async () => {
  return puppeteer
    .launch({ headless: true, ignoreHTTPSErrors: true, defaultViewport: null,
      args:['--start-maximized']
    })
    .then(builtBrowser => {
      browser = builtBrowser
      browser.on('disconnected', setupBrowser)
    })
}
setupBrowser()

process.on('SIGINT', () => {
  browser.close()
})

// Build an Anyproxy module following its specification.
export default {
  summary: 'Puppeteer rules for anyproxy',
  *beforeSendRequest(requestDetail) {
    const {
      url,
      requestOptions: { path, hostname },
      protocol,
    } = requestDetail

    if (new RegExp(`/https?:\/\/.*@${hostname}`).test(url)) {
      return {
        response: {
          statusCode: 404,
          header: { 'content-type': 'text/html' },
          body: '',
        },
      }
    }

    return null
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const {
      url,
      requestOptions: { path, hostname },
      protocol,
    } = requestDetail

    const { 'Content-Type': contentType = '' } = responseDetail.response.header
    if (contentType.split(';')[0] === 'text/html') {
      const html = responseDetail.response.body.toString('utf8')
      return browser
        .newPage()
        .then(async page => {
          const rawSetCookie = responseDetail.response.header["Set-Cookie"];
          const setCookieList = Array.isArray(rawSetCookie)
            ? rawSetCookie
            : (rawSetCookie ? [rawSetCookie] : []);
          if (setCookieList.length > 0) {
            try {
              const parsedCookies = setCookieList
                .filter(line => typeof line === 'string' && line.trim() !== '')
                .map((line) => {
                  const parts = line.split(';').map(p => p.trim()).filter(Boolean);
                  if (parts.length === 0) return null;

                  const nameValue = parts[0];
                  const eqIndex = nameValue.indexOf('=');
                  if (eqIndex < 0) return null;

                  const name = nameValue.substring(0, eqIndex).trim();
                  let value = nameValue.substring(eqIndex + 1).trim();
                  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                  }
                  if (!name || value === undefined) return null;

                  const cookie = { name, value };
                  let hasDomainAttr = false;
                  for (let i = 1; i < parts.length; i++) {
                    const attr = parts[i];
                    const [rawKey, ...rawValParts] = attr.split('=');
                    const key = rawKey.trim().toLowerCase();
                    const val = rawValParts.join('=').trim();
                    if (key === 'secure') {
                      cookie.secure = true;
                    } else if (key === 'httponly') {
                      cookie.httpOnly = true;
                    } else if (key === 'path') {
                      cookie.path = val || '/';
                    } else if (key === 'domain') {
                      hasDomainAttr = true;
                      // Normalize domain by removing leading dot if present
                      const normalized = val.startsWith('.') ? val.substring(1) : val;
                      cookie.domain = normalized.toLowerCase();
                    } else if (key === 'samesite') {
                      const lower = val.toLowerCase();
                      if (lower === 'none') cookie.sameSite = 'None';
                      else if (lower === 'lax') cookie.sameSite = 'Lax';
                      else if (lower === 'strict') cookie.sameSite = 'Strict';
                    }
                  }

                  // Defaults
                  if (!cookie.path) cookie.path = '/';

                  // Prefix rules
                  const isSecurePrefix = name.startsWith('__Secure-');
                  const isHostPrefix = name.startsWith('__Host-');
                  if (isSecurePrefix) {
                    cookie.secure = true;
                  }
                  if (isHostPrefix) {
                    cookie.secure = true;
                    cookie.path = '/';
                    // host-only cookie: must NOT include domain
                    delete cookie.domain;
                    hasDomainAttr = false;
                  }

                  // SameSite=None requires Secure
                  if (cookie.sameSite === 'None') {
                    cookie.secure = true;
                  }

                  // If no Domain attribute present, set as host-only cookie using URL
                  if (!hasDomainAttr || !cookie.domain) {
                    const scheme = protocol && protocol.endsWith(':') ? protocol.slice(0, -1) : protocol;
                    const origin = `${scheme}://${hostname}`;
                    cookie.url = origin + (cookie.path || '/');
                    delete cookie.domain;
                  }

                  return cookie;
                })
                .filter((c) => !!c);

              if (parsedCookies.length > 0) {
                console.log('Setting cookies:', parsedCookies);
                try {
                  await page.setCookie(...parsedCookies);
                } catch (cookieError) {
                  console.log('Cookie setting error:', cookieError);
                  for (const cookie of parsedCookies) {
                    try {
                      await page.setCookie(cookie);
                    } catch (singleCookieError) {
                      console.log('Failed to set cookie:', cookie.name, singleCookieError);
                    }
                  }
                }
              }
            } catch (error) {
              console.log('Cookie parsing error:', error);
            }
          }
          await page.goto(url, { waitUntil: "networkidle0" });
          // await evaluateToMinimizeLinkList(page);

          const newResponse = responseDetail.response;
          newResponse.body = await page.content();
          await page.close()
          return {
            response: newResponse,
          }
        })
        .catch(err => {
          console.log('Failed to render url', url, err)
        })
    }
    return null
  },
  *onError(requestDetail, error) {
    console.log('onError: ', requestDetail, error);
  },
  *onConnectError(requestDetail, error) {
    console.log('onConnectError: ', requestDetail, error);
  },
}

async function evaluateToMinimizeLinkList(page){
  return await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);

    var compareDomPath = function(el1, el2, stopSign=""){
      var domPath1 = getDomPath(el1);
      var domPath2 = getDomPath(el2);
    
      if(domPath1.length !== domPath2.length) return false;
    
      for (var index = domPath1.length - 1; index >= 0; index--) {
        if(domPath1[index].indexOf(stopSign) > -1) return true;
        if(domPath1[index] !== domPath2[index]) {
          return false;
        }
      }
      return true;
    }
    
    var getDomPath = function(el){
      var stack = [];
      while ( el.parentNode != null ) {
        var sibCount = 0;
        var sibIndex = 0;
        for ( var i = 0; i < el.parentNode.childNodes.length; i++ ) {
          var sib = el.parentNode.childNodes[i];
          if ( sib.nodeName == el.nodeName ) {
            if ( sib === el ) {
              sibIndex = sibCount;
            }
            sibCount++;
          }
        }
        if ( el.hasAttribute('id') && el.id != '' ) {
          stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
        } else if ( sibCount > 1 &&  sibIndex > 0) {
          stack.unshift(el.nodeName.toLowerCase() + ':eq(' + sibIndex + ')');
        } else {
          stack.unshift(el.nodeName.toLowerCase());
        }
        el = el.parentNode;
      }
    
      return stack.slice(1); // removes the html element
    }
    
    var tr_list = document.querySelectorAll("tbody > tr");
    if(tr_list.length == 0) return;

    var tr_first_a = tr_list[0].querySelectorAll("a");
    if(!tr_first_a) return;
    if(tr_first_a.length == 0) return;
    
    tr_list.forEach((item) => {
      var item_a = item.querySelectorAll("a");
      item_a.forEach((a_tag_source) => {
        tr_first_a.forEach((a_tag_target) => {
          if(!a_tag_target || !a_tag_source) return;
          if(a_tag_target.href === "#" || a_tag_source.href === "#") return;
          if(a_tag_target.href.indexOf("javascript") > -1 || a_tag_source.href.indexOf("javascript") > -1) return;
    
          var result = compareDomPath(a_tag_source, a_tag_target, "tr");
          if(result){
            a_tag_source.href = a_tag_target.href;
          }
        })
      })
    });
  })
}
