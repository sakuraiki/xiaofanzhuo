'use strict'

var path = require('path')

var config = require('../config')
var Wechat = require('../wechat/wechat')
var mysql = require('../libs/mysql')

var menu = config.menu
var host = config.host
var wechatApi = new Wechat(config.wechat)

exports.reply = function* (next){
	var message = this.weixin
	wechatApi.deleteMenu()
		.then(function(){
			console.log(menu)
			return wechatApi.createMenu(menu)
		})
		.then(function(msg){
			console.log(msg)
		})

	if(message.MsgType === 'event'){
		if(message.Event === 'LOCATION'){
			yield mysql.insertOrUpdateWxuser(message.FromUserName,message.Longitude,message.Latitude,null,+new Date())
			console.log(message.FromUserName + '的地理位置是: '+ message.Longitude + message.Latitude+ message.Precision)
			this.body = '您上报的地理位置是： '+ message.Longitude + ',' + message.Latitude + '您可以直接回復學校名搜索學校附近小飯桌。'
		}else if(message.Event === 'CLICK'){
			console.log(message.FromUserName + '点击了菜单: '+ message.EventKey)
			var userInfo = yield mysql.findWxuser(message.FromUserName)
			console.log(JSON.stringify(userInfo))
			userInfo = JSON.parse(JSON.stringify(userInfo))[0]

			var distance = 0.5
			if(message.EventKey === 'SEARCH_NEARBY_500M'){
				distance = 0.5
			}else if(message.EventKey === 'SEARCH_NEARBY_1000M'){
				distance = 1
			}else if(message.EventKey === 'SEARCH_NEARBY_2000M'){
				distance = 2
			}

			var result
			var xfzlist = []
			if(userInfo){
				var latitude = userInfo.latitude
				var longitude = userInfo.longitude
				console.log(latitude,longitude)
				var _sql = `select * from xfzs where latitude<>0 and longitude<>0 and latitude > ${latitude}-1 and latitude < ${latitude}+1 and longitude > ${longitude}-0.1 and longitude < ${longitude}+0.1 order by ACOS(SIN((${latitude} * 3.14159) / 180 ) *SIN((latitude * 3.14159) / 180 ) +COS((${latitude} * 3.14159) / 180 ) * COS((latitude * 3.14159) / 180 ) *COS((${longitude}* 3.14159) / 180 - (longitude * 3.14159) / 180 ) ) * 6380 asc limit 20`
				var sqlResult = yield mysql.query(_sql)
				result = JSON.parse(JSON.stringify(sqlResult))
				if(result){
					for(var i = 0; i < result.length; ++i){
						var pi = 3.1415926
						var line = result[i]
						var isInDistance = sqrt( ( ((longitude-line.longitude)*pi*12656*cos(((latitude+line.latitude)/2)*pi/180)/180) * ((longitude-line.longitude)*pi*12656*cos (((latitude+line.latitude)/2)*pi/180)/180) ) + ( ((latitude-line.latitude)*pi*12656/180) * ((latitude-line.latitude)*pi*12656/180) ) ) < distance
						var _url = host? host + '/detail?id=' + line.id : '/detail?id=' + line.id
						isInDistance && xfzlist.push('<a href ="' + _url +'">' + line.name + '</a>\n')
						console.log(line.id + 'is inDistance: ' + isInDistance)
					}
				}
			}

			if(userInfo && result && xfzlist>0){
				this.body = '您附近的小飯桌有: \n' + JSON.stringify(xfzlist)
			}else{
				this.body = '您附近' + distance + '公里內沒有小飯桌'
			}
		}
	}else if(message.MsgType === 'text'){
		var content = message.Content
		var reply = ''
		if(content.indexOf('#') > -1){
			var userInfo = yield mysql.findWxuser(message.FromUserName)
			userInfo = JSON.parse(JSON.stringify(userInfo))[0]
			if(userInfo && userInfo.keyword){
				reply = '該學校附近的小飯桌有:\n'
				var _result = yield mysql.findSchoolByName(userInfo.keyword)
				_result = JSON.parse(JSON.stringify(_result))
				var _index = content.split('#')[1] - 1
				_result = yield mysql.findSchoolByFullName(_result[_index].name)
				_result = JSON.parse(JSON.stringify(_result))
				console.log(JSON.stringify(_result))
				if(_result){
					for(var i = 0; i < _result.length; ++i){
						var _url = host? host + '/detail?id=' + _result[i].xfzid : '/detail?id=' + _result[i].xfzid
						reply += '<a href ="'+ _url +'">'+ _result[i].xfzname +'</a>\n'
					}
				}else{
					reply += '無'
				}
			}
			console.log(reply)
		}else{
			var userInfo = yield mysql.findWxuser(message.FromUserName)
			userInfo = JSON.parse(JSON.stringify(userInfo))[0]
			if(userInfo){
				reply = '您想搜索的學校是:\n'
				var _result = yield mysql.findSchoolByName(content)
				_result = JSON.parse(JSON.stringify(_result))
				yield mysql.insertOrUpdateWxuser(message.FromUserName,userInfo.longitude,userInfo.latitude,content,+new Date())
				if(_result.length === 1 && _result.xfzname === content){
					reply = '該學校附近的小飯桌為:\n'
					var _url = host? host + '/detail?id=' + _result[0].xfzid : '/detail?id=' + _result[0].xfzid
					reply += '<a href ="'+ _url +'">'+ _result[0].xfzname +'</a>\n'
				}else{
					if(_result){
						for(var i = 0; i < _result.length; ++i){
							reply += `#${i+1}:${_result[i].name}\n`
						}
					}else{
						reply += '無'
					}
				}
			}
		}


		this.body = reply
	}
}