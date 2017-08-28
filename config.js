'use strict'

var path = require('path')

var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')
var jsticket_file = path.join(__dirname, './config/jsticket.txt')

var config = {
	wechat:{
		appID: 'wxe340eb20f4c231ea',
		appSecret: 'd4624c36b6795d1d99dcf0547af5443d',
		token: 'CaiNiao212',
		getAccessToken: function(){
			return util.readFileAsync(wechat_file)
		},
		saveAccessToken: function(data){
			data = JSON.stringify(data)
			return util.writeFileAsync(wechat_file, data)
		},
		getTicket: function(){
			return util.readFileAsync(jsticket_file)
		},
		saveTicket: function(data){
			data = JSON.stringify(data)
			return util.writeFileAsync(jsticket_file, data)
		}
	},
	menu:{
		"button": [ 
		    { 
		        "name": "查询附近", 
		        "sub_button":[ 
		                { 
		                    "type": "click", 
		                    "name": "500m", 
		                    "key": "SEARCH_NEARBY_500M"
		                }, 
		                { 
		                    "type": "click", 
		                    "name": "1000m", 
		                    "key": "SEARCH_NEARBY_1000M"
		                }, 
		                { 
		                    "type": "click", 
		                    "name": "2000m", 
		                    "key": "SEARCH_NEARBY_2000M"
		                }
		            ]
		    // },
		    // {
		    // 	"type":"view",
      //          "name":"打开网页",
      //          "url":"http://www.soso.com/"
		    }
		]
	},
	database: {
	    DATABASE: 'xfzsql',
	    USERNAME: 'root',
	    PASSWORD: '',
	    PORT: '3306',
	    HOST: 'localhost'
	},
	host: 'https://47.94.41.239:80',
	titleAttribute: '超级好吃的'
}

module.exports = config