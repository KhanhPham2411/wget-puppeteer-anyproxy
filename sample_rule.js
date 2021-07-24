// Step 1，Write the rule file, save as sample.js
module.exports = {
  summary: 'a rule to hack response',
  *beforeSendResponse(requestDetail, responseDetail) {
    if (requestDetail.url === 'http://httpbin.org/user-agent') {
      const newResponse = responseDetail.response;
      newResponse.body += '- AnyProxy Hacked!';

      return new Promise((resolve, reject) => {
        setTimeout(() => { // delay
          resolve({ response: newResponse });
        }, 5000);
      });
    }
  },
};

// Step 2, start AnyProxy and load the rule file
// anyproxy --rule sample.js

// Step 3, test
// use curl
// curl http://httpbin.org/user-agent --proxy http://127.0.0.1:8001
// use browser. Point the http proxy of browser to 127.0.0.1:8001, then visit http://httpbin.org/user-agent
// the expected response from proxy is
// {
//   "user-agent": "curl/7.43.0"
// }
// - AnyProxy Hacked!

// Step 4, view the request log
// visit http://127.0.0.1:8002, the request just sent should be listed here