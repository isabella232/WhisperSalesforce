var express = require('express');
var app = express();

app.get('/chatbot', function(req,res) {
    let data = {
        message: 'Titre',
        url: 'www.google.ca'
    };
	res.json(data);
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Server started at http://%s:%s', host, port);
});


process.stdin.resume();
function exitHandler(options, err) {
    if (err) console.log(err.stack);
    process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));