'use strict'

var Promise = require('bluebird')
var request = Promise.promisify(require('request'))
var fs = require('fs')
var _ = require('lodash')

var util = require('./wechat-util')

var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var mpPrefix = 'https://mp.weixin.qq.com/cgi-bin/'

var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary:{
		upload: prefix + 'media/upload?',
		fetch: prefix + 'media/get?'
	},
	permanent:{
		upload: prefix + 'material/add_material?',
		uploadNews: prefix + 'material/add_news?',
		uploadNewsPic: prefix + 'media/uploadimg?',
		fetch: prefix + 'material/get_material?',
		del: prefix + 'material/del_material?',
		update: prefix + 'material/update_news?',
		count: prefix + 'material/get_materialcount?',
		batch: prefix + 'material/batchget_material?'
	},
	group:{
		tags:{
			create: prefix + 'tags/create?',
			get: prefix + 'tags/get?',
			update: prefix + 'tags/update?',
			delete: prefix + 'tags/delete?'
		},
		user:{
			get: prefix + 'user/tag/get?',
			batchTagging: prefix + 'tags/members/batchtagging?',
			batchUntagging: prefix + 'tags/members/batchuntagging?',
			getIdList: prefix + 'tags/getidlist?'
		}
		
	},
	user:{
		remark: prefix + 'user/info/updateremark?',
		fetch: prefix + 'user/info?',
		batchGet: prefix + 'user/info/batchget?',
		list: prefix + 'user/get?'
	},
	mass:{
		tag: prefix + 'message/mass/sendall?',
		openId: prefix + 'message/mass/send?',
		del: prefix + 'message/mass/delete?',
		preview: prefix + 'message/mass/preview?',
		check: prefix + 'message/mass/get?'
	},
	menu:{
		create: prefix + 'menu/create?',
		get: prefix + 'menu/get?',
		del: prefix + 'menu/delete?',
		selfMenuInfo: prefix + 'get_current_selfmenu_info?'
	},
	qrcode:{
		create: prefix + 'qrcode/create?',
		show: mpPrefix + 'showqrcode?'
	},
	shortUrl: {
		create: prefix + 'shorturl?'
	},
	semantic: 'https://api.weixin.qq.com/semantic/semproxy/search?',
	ticket:{
		get: prefix + 'ticket/getticket?'
	}
	
}


function Wechat(opts){
	var self = this
	console.log("In Wechat")
	self.appID = opts.appID
	self.appSecret = opts.appSecret
	self.getAccessToken = opts.getAccessToken
	self.saveAccessToken = opts.saveAccessToken
	self.getTicket = opts.getTicket
	self.saveTicket = opts.saveTicket

	self.getAccessToken()
		.then(function(data){
			try{
				data = JSON.parse(data)
			}catch(e){
				return self.updateAccessToken()
			}

			if(self.isValidAccessToken(data)){
				return Promise.resolve(data)
			}else{
				return self.updateAccessToken()
			}
		})
		.then(function(data){
			self.access_token = data.access_token
			self.expires_in = data.expires_in

			self.saveAccessToken(data)
		})
}

Wechat.prototype.isValidAccessToken = function(data){
	if(!data || !data.access_token || !data.expires_in){
		return false
	}

	var access_token = data.access_token
	var expires_in = data.expires_in
	var now = (new Date().getTime())

	if(now < expires_in){
		return true
	}else{
		return false
	}
}

Wechat.prototype.updateAccessToken = function(){

	var appID = this.appID
	var appSecret = this.appSecret
	var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret
	// console.log('#######################'+url)

	return new Promise(function(resolve, reject){
		request({url: url, json: true})
		.then(function(response){
			// console.log('***************'+response.body)
			var data = response.body
			var now = (new Date().getTime())
			var expires_in = now + (data.expires_in - 30) * 1000

			data.expires_in = expires_in

			resolve(data) 
		})
	})
}

Wechat.prototype.fetchAccessToken = function(){
	var self = this

	// if(self.access_token && self.expires_in){
	// 	if(self.isValidAccessToken(self)){
	// 		return Promise.resolve(self)
	// 	}
	// }

	return self.getAccessToken()
		.then(function(data){
			try{
				data = JSON.parse(data)
			}catch(e){
				return self.updateAccessToken()
			}

			if(self.isValidAccessToken(data)){
				return Promise.resolve(data)
			}else{
				return self.updateAccessToken()
			}
		})
		.then(function(data){
			// self.access_token = data.access_token
			// self.expires_in = data.expires_in

			self.saveAccessToken(data)

			return Promise.resolve(data)
		})
}



Wechat.prototype.uploadMaterial = function(type, material, permanent){
	var self = this
	var form = {
		// media: fs.createReadStream(filepath)
	}

	var uploadUrl = api.temporary.upload

	if(permanent){
		uploadUrl = api.permanent.upload

		_.extend(form, permanent)
	}

	if(type === 'pic'){
		uploadUrl = api.permanent.uploadNewsPic
	}

	if(type === 'news'){
		uploadUrl = api.permanent.uploadNews
		form = material
	}else{
		form.media = fs.createReadStream(material)
	}

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = uploadUrl + 'access_token=' + data.access_token

				if(!permanent){
					url += '&type=' + type
				}else{
					form.access_token = data.access_token
				}

				var options = {
					method: 'POST',
					url: url,
					json: true
				}

				if(type === 'news'){
					options.body = form
				}else{
					options.formData = form
				}

				request(options)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Upload material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.fetchMaterial = function(mediaId, type, permanent){
	var self = this
	var form = {
		// media: fs.createReadStream(filepath)
	}

	var fetchUrl = api.temporary.fetch

	if(permanent){
		fetchUrl = api.permanent.fetch
	}

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = fetchUrl + 'access_token=' + data.access_token

				var options = { method: 'POST', url: url, json: true }
				var form = {}

				if(permanent){
					form.media_id = mediaId
					form.access_token = data.access_token
					options.body = form
				}else{
					if(type === 'video'){
						url = url.replace('https://', 'http://')
						// url += '&type=' + type
					}
					url += '&media_id=' + mediaId
				}

				if( type === 'news' || type === 'video'){
					request(options)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Fetch material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
				}else{
					resolve(url)
				}

			})
	})
}

Wechat.prototype.deleteMaterial = function(mediaId){
	var self = this
	var form = {
		media_id: mediaId
	}

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId
				var options = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(options)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Delete material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.updateMaterial = function(mediaId, news){
	var self = this
	var form = {
		media_id: mediaId
	}

	_.extend(form, news)
	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId
				var options = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(options)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Upload material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.countMaterial = function(){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.count + 'access_token=' + data.access_token
				var options = {
					method: 'GET',
					url: url,
					json: true
				}
				request(options)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Count material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.batchMaterial = function(options){
	var self = this

	options.type = options.type || 'image'
	options.offset = options.offset || 0
	options.count = options.count || 1	//Max count => 20

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.batch + 'access_token=' + data.access_token
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: options
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Batch material failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}


Wechat.prototype.createTag = function(name){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.tags.create + 'access_token=' + data.access_token
				var form = {
					tag:{
						name: name
					}
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Create tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.fetchTags = function(){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.tags.get + 'access_token=' + data.access_token
				var opts = {
					method: 'GET',
					url: url,
					json: true
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Fetch tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.getIdListTag = function(openId){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.user.getIdList + 'access_token=' + data.access_token
				var form = {
					openid: openId
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Get id list failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.updateTag = function(id, name){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.tags.update + 'access_token=' + data.access_token
				var form = {
					tag: {
						id: id,
						name: name
					}
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Update tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.batchTag = function(openIds, tagId){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.user.batchTagging + 'access_token=' + data.access_token
				if(!_.isArray(openIds)){
					openIds = [openIds]
				}
				var form = {
					openid_list: openIds,
					tagid: tagId
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Batch user list with tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.deleteTag = function(id){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.tags.delete + 'access_token=' + data.access_token
				var form = {
					tag: {
						id: id
					}
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Delete tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.remarkUser = function(openId, remark){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.user.remark + 'access_token=' + data.access_token
				var form = {
					openid: openId,
					remark: remark
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Remark user failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.fetchUsers = function(openIds, lang){
	var self = this
	lang = lang || 'zh_CN'

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url, form
				var opts = {
					json: true
				}
				if(_.isArray(openIds)){
					opts.url = api.user.batchGet + 'access_token=' + data.access_token
					form = {
						user_list: openIds
					}
					opts.body = form
					opts.method = 'POST'
				}else{
					opts.url = api.user.fetch + 'access_token=' + data.access_token + '&openid=' + openIds + '&lang=' + lang
					console.log(opts.url)
					opts.method = 'GET'
				}
				
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Fetch users failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.listUsers = function(openId){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.user.list + 'access_token=' + data.access_token
				
				if(openId){
					url += '&next_openid=' + openId
				}

				var opts = {
					method: 'GET',
					url: url,
					json: true
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('List user failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}


Wechat.prototype.sendByTag = function(type, message, tagId){
	var self = this
	var msg = {
		filter: {},
		msgtype: type
	}

	msg[type] = message

	if(!tagId){
		msg.filter.is_to_all = true
	}else{
		msg.filter = {
			is_to_all: false,
			tag_id: tagId
		}
	}

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.mass.tag + 'access_token=' + data.access_token

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: msg
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Send by tag failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.sendByOpenId = function(type, message, openIds){
	var self = this
	var msg = {
		msgtype: type,
		touser: openIds
	}

	msg[type] = message

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.mass.openId + 'access_token=' + data.access_token

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: msg
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Send by openid failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.deleteMass = function(msgId, articleIndex){//article_idx	要删除的文章在图文消息中的位置，第一篇编号为1，该字段不填或填0会删除全部文章
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.mass.del + 'access_token=' + data.access_token

				var form = {
					msg_id: msgId,
					article_idx: articleIndex || 0
				}
				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Delete mass failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.previewMass = function(type, message, openId){
}

Wechat.prototype.checkMass = function(type, message, openId){
	var self = this
	var form = {
		msg_id: type
	}

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.mass.check + 'access_token=' + data.access_token

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Check mass failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}


Wechat.prototype.createMenu = function(menu){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.menu.create + 'access_token=' + data.access_token

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: menu
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Create menu failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.getMenu = function(){
	var self = this
	
	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.menu.get + 'access_token=' + data.access_token

				var opts = {
					method: 'GET',
					url: url,
					json: true
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Get menu failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.deleteMenu = function(){
	var self = this
	
	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.menu.del + 'access_token=' + data.access_token

				var opts = {
					method: 'GET',
					url: url,
					json: true
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Delete menu failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.getMenuConfig = function(){
	var self = this
	
	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.menu.selfMenuInfo + 'access_token=' + data.access_token

				var opts = {
					method: 'GET',
					url: url,
					json: true
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Get current selfmenu info failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}


Wechat.prototype.createQrcode = function(qr){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.qrcode.create + 'access_token=' + data.access_token

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: qr
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Create Qrcode failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}

Wechat.prototype.showQrcode = function(ticket){
	return api.qrcode.show + 'ticket=' + encodeURI(ticket)
}


Wechat.prototype.createShortUrl = function(longUrl, action){
	var self = this

	action = action || 'long2short'

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.shortUrl.create + 'access_token=' + data.access_token

				var form = {
					action: action,
					long_url: longUrl
				}

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Create short url failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}


Wechat.prototype.semantic = function(semanticData){
	var self = this

	return new Promise(function(resolve, reject){
		self
			.fetchAccessToken()
			.then(function(data){
				var url = api.semantic + 'access_token=' + data.access_token

				semanticData.appid = data.appID

				var opts = {
					method: 'POST',
					url: url,
					json: true,
					body: semanticData
				}
				request(opts)
					.then(function(response){
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Create short url failed')
						}
					})
					.catch(function(err){
						reject(err)
					})
			})
	})
}



Wechat.prototype.fetchTicket = function(access_token){
	var self = this

	return self.getTicket()
		.then(function(data){
			try{
				data = JSON.parse(data)
			}catch(e){
				return self.updateTicket(access_token)
			}

			if(self.isValidTicket(data)){
				return Promise.resolve(data)
			}else{
				return self.updateTicket(access_token)
			}
		})
		.then(function(data){
			self.saveTicket(data)

			return Promise.resolve(data)
		})
}

Wechat.prototype.isValidTicket = function(data){
	console.log(data)
	if(!data || !data.ticket || !data.expires_in){
		return false
	}

	var ticket = data.ticket
	var expires_in = data.expires_in
	var now = (new Date().getTime())

	if(ticket && now < expires_in){
		return true
	}else{
		return false
	}
}

Wechat.prototype.updateTicket = function(access_token){
	var url = api.ticket.get + '&access_token=' + access_token + '&type=jsapi'

	return new Promise(function(resolve, reject){
		request({url: url, json: true})
		.then(function(response){
			console.log('***************'+response.body)
			var data = response.body
			var now = (new Date().getTime())
			var expires_in = now + (data.expires_in - 30) * 1000

			data.expires_in = expires_in

			resolve(data) 
		})
	})
}





Wechat.prototype.reply = function(){

	var content = this.body
	var message = this.weixin

	var xml = util.tpl(content, message)
	this.status = 200
	this.type = 'application/xml'
	this.body = xml
	console.log('parsed xml: '+xml)
}

module.exports = Wechat