# Happy New Year Challenge 2017

## Generating Self-Signed Certificate

This action allows use secured HTTP.  
[Source](https://docs.nodejitsu.com/articles/HTTP/servers/how-to-create-a-HTTPS-server/)

Generation:
```bash
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```

Sample:
```js
var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

var a = https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8000);
```
