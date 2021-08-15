//ElasticSearch module load
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: 'search-elastic-domain-c5iysdz54dot2vt25nqvznjml4.us-east-2.es.amazonaws.com',
  log: 'trace'
});

//socket.io module load and initialize
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));
app.get('/', (req, res) => {  res.sendFile(__dirname + '/matrix.html');   });
app.get('/matrix', (req, res) => {  res.sendFile(__dirname + '/matrix.html'); });

//AWS IoT module load  and initialize
const awsIot = require('aws-iot-device-sdk');
const device = awsIot.device({
 		host: "a287p9vwxu3415-ats.iot.us-east-2.amazonaws.com",
		port: 8883,
		clientId: "client",
		keyPath: "./AWSIoT_Files/Thing.private.key",
		certPath: "./AWSIoT_Files/Thing.cert.pem",
		caPath: "./AWSIoT_Files/root-CA.crt"
});

//Redis module load
	//ローカル実行の場合
//var redis = require('redis').createClient('redis://:p6d6bb3c063e43fa4c5bd845409d95b7c36f68d62449d971963b959bdb2d3c220@ec2-44-197-80-249.compute-1.amazonaws.com:9229');
	//クラウド実行の場合
var redis = require('redis').createClient(process.env.REDIS_URL);
redis.on('connect', function() {    console.log('Connect success');});
redis.on('error', function (err) {    console.log('Connect Error：' + err);});


/////////////////////////////////////////////////////
//
// 	Webサーバ起動＆非同期処理
//
/////////////////////////////////////////////////////
//ローカル実行の場合
//server.listen(3000, () => {  console.log('listening on ',3000);  });
	//クラウド実行の場合
server.listen(process.env.PORT, () => {  console.log('listening on ',process.env.PORT); });

io.on('connection', (socket) =>  { 
	console.log('a user connected');

	// 切断時コールバック関数登録
	socket.on('disconnect',      () => { console.log('user disconnected');  });

	// メッセージ受信時コールバック関数登録
	socket.on('chat message', (msg) => { 
		var cmd_list = new Set(['Online','Offline','Status','Green','Yellow','Red']);
		console.log('message: ' + msg);
		io.emit('chat message', msg);

		if (cmd_list.has(msg)){
			console.log('command accepted!');
			switch (msg){
				case 'Green':
				case 'Yellow':
				case 'Red':
					io.emit('rain message', {color: msg, text: '' } );
					break;

				case 'Online':
					device.publish('$aws/things/Thing/shadow/update',JSON.stringify({"state":{"desired":{"macine1":"Online"}}}));
					break;

				case 'Offline':
					device.publish('$aws/things/Thing/shadow/update',JSON.stringify({"state":{"desired":{"macine1":"Offline"}}}));
					break;

				case 'Status':
					device.publish('$aws/things/Thing/shadow/get');
					break;

				default:
					break;
		 	}
		}
	});
});

/////////////////////////////////////////////////////
//
// 	AWS Elasticsearch Access ＆ Redis update処理
//
/////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////
//
// 	AWS Elasticsearch Access ＆ Redis update処理
//
/////////////////////////////////////////////////////


device.on('connect', function() {
	console.log('connect');
	device.subscribe('$aws/things/Thing/shadow/update/accepted');
	device.subscribe('$aws/things/Thing/shadow/get/accepted');
});

device.on('message', function(topic, payload) {
	console.log(payload.toString());
 	var jsondata = JSON.parse(payload)
	if(typeof jsondata.state.desired !== 'undefined' && typeof jsondata.state.reported !== 'undefined' ){
		io.emit('chat message', 'Device is '+jsondata.state.reported.macine1+", desired "+jsondata.state.desired.macine1);
	}else if(typeof jsondata.state.desired !== 'undefined'){
		// io.emit('chat message', 'Change to desired Status: '+jsondata.state.desired.macine1);
	}else if(typeof jsondata.state.reported !== 'undefined'){
		io.emit('chat message', 'Remote device status changed, now '+jsondata.state.reported.macine1);
	}

});


