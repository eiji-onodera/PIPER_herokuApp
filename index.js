const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: 'search-elastic-domain-c5iysdz54dot2vt25nqvznjml4.us-east-2.es.amazonaws.com',
  log: 'trace'
});

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));
app.get('/', (req, res) => {  res.sendFile(__dirname + '/matrix.html');   });
app.get('/matrix', (req, res) => {  res.sendFile(__dirname + '/matrix.html'); });

//ローカル実行の場合
//var redis = require('redis').createClient('redis://:p6d6bb3c063e43fa4c5bd845409d95b7c36f68d62449d971963b959bdb2d3c220@ec2-44-197-80-249.compute-1.amazonaws.com:9229');
var redis = require('redis').createClient(process.env.REDIS_URL);
redis.on('connect', function() {    console.log('Connect success');});
redis.on('error', function (err) {    console.log('Connect Error：' + err);});


io.on('connection', (socket) =>  { 
  socket.on('disconnect',      () => { console.log('user disconnected');  });
  socket.on('chat message', (msg) => { io.emit('chat message', msg); console.log('message: ' + msg); io.emit('rain message', {color: msg, text: '' } ); } );
  console.log('a user connected');
});

//ローカル実行の場合
//server.listen(3000, () => {
//  console.log('listening on ',3000);
//});
server.listen(process.env.PORT, () => {
  console.log('listening on ',process.env.PORT);
});

setInterval(get_elastic, 15000);

async function get_elastic(){
	const response = await client.search({
	  index: 'sample_data',
	  body: {
	  "query": {   "match_all": {}  },
	  "size": 1,
	  "sort": [   {  "timestamp": {"order": "desc"} }  ]
	  }
	})
	for (const blog of response.hits.hits) {
	  console.log('sample_data:', blog);
	}

	var msg_data = response.hits.hits[0]._source.timestamp +
					response.hits.hits[0]._source.signal + 
					response.hits.hits[0]._source.brix + 
					response.hits.hits[0]._source.color;
	write_to_redis(response.hits.hits[0]._source.timestamp, msg_data);

	io.emit('rain message', {color: response.hits.hits[0]._source.signal, text: msg_data} ); 

	

}

function write_to_redis(key,val){
	redis.set(key, val);
	redis.get(key, function (error, result) {	console.log(result);});
}
