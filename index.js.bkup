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
app.get('/', (req, res) => {  res.sendFile(__dirname + '/index.html');   });
app.get('/matrix', (req, res) => {  res.sendFile(__dirname + '/matrix.html'); });



io.on('connection', (socket) =>  { 
  socket.on('disconnect',      () => { console.log('user disconnected');  });
  socket.on('chat message', (msg) => { io.emit('chat message', msg); console.log('message: ' + msg); io.emit('rain message', msg); } );
  console.log('a user connected');
});

//ローカル実行の場合
//server.listen(3000, () => {
//  console.log('listening on ',3000);
//});

server.listen(process.env.PORT, () => {
  console.log('listening on ',process.env.PORT);
});



function intervalFunc() {
  io.emit('chat message', 'aaaaaaa!!!'); 
  console.log('Cant stop me now!');
}

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
	io.emit('chat message', response.hits.hits[0]._source.text_data); 
}

setInterval(get_elastic, 15000);
