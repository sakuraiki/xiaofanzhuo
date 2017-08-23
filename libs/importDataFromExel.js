var xlsx = require("node-xlsx");
var mysql = require("./mysql")

var dataForm = {
				"省份":0,
				"地级市":1,
        		"县级市":2,
        		"毗邻学校名称":3,
        		"小饭桌名称":4,
        		"地址":5,
        		"容纳人数":6,
        		"开办者":7,
        		"联系电话":8,
        		"是否提供午休":9,
        		"街道":10,
        		"小饭桌编号":11,
        		"坐标经度":12,
        		"坐标纬度":13,
        		"照片":14
        	};

var exel = xlsx.parse("../山东地区汇总 - 副本.xlsx");
var list = exel[0].data;
console.log(list.name);
console.log(list.length);
// console.log(JSON.stringify(list));

var idx=1;
var singleXfzValue,singleSchoolValue;
var len = list.length - 1;
var xfzQueryValues = '',schoolQueryValues = '';
for(idx = 1; idx <= len; ++idx){
	var line = list[idx];
	// console.log(idx)
	// console.log(line)
	var xfzData = {
		id: line[dataForm['小饭桌编号']]||0,
		name: line[dataForm['小饭桌名称']]||"无",
		address: line[dataForm['地址']]||"无",
		contactor: line[dataForm['开办者']]||"无",
		tel: line[dataForm['联系电话']]||0,
		longitude: line[dataForm['坐标经度']]||0,
		latitude: line[dataForm['坐标纬度']]||0,
		volume: line[dataForm['容纳人数']]||0,
		photolist: line[dataForm['照片']]||"",
	};
	if(xfzData.id === 0){
		continue;
	}
	if(xfzData.longitude && xfzData.longitude.indexOf(',') > -1 && !xfzData.latitude){
		var splitlist = xfzData.longitude.split(',');
		xfzData.longitude = splitlist[0];
		xfzData.latitude = splitlist[1];
	}
	singleXfzValue = `(${xfzData.id},"${xfzData.name}","${xfzData.address}","${xfzData.contactor}","${xfzData.tel}",${xfzData.longitude},${xfzData.latitude},${xfzData.volume},"${xfzData.photolist}")`;

	var schoolData = {
		name: line[dataForm['毗邻学校名称']],
		xfzid: line[dataForm['小饭桌编号']],
		xfzname: line[dataForm['小饭桌名称']]
	};
	singleSchoolValue = `("${schoolData.name}",${schoolData.xfzid},"${schoolData.xfzname}")`;

	if(idx < len){
		singleXfzValue += ','
		singleSchoolValue += ','
	}
	xfzQueryValues += singleXfzValue;
	schoolQueryValues += singleSchoolValue;
}

// console.log(xfzQueryValues)
// console.log(schoolQueryValues)
// console.log('insert into xfzs(id,name,address,contactor,tel,longitude,latitude,volume,photolist) values' + xfzQueryValues + ' ON DUPLICATE KEY UPDATE name=values(name),address=values(address),contactor=values(contactor),tel=values(tel),longitude=values(longitude),latitude=values(latitude),volume=values(volume),photolist=values(photolist);')
console.log('insert into schools(name,xfzid,xfzname) values' + schoolQueryValues + ' ON DUPLICATE KEY UPDATE name=values(name),xfzid=values(xfzid),xfzname=values(xfzname);');
// var updateXfzInfo = await query('insert into xfzs(id,name,address,contactor,tel,longitude,latitude,volume,photolist) values' + xfzQueryValues + ' ON DUPLICATE KEY UPDATE name=values(name),address=values(address),contactor=values(contactor),tel=values(tel),longitude=values(longitude),latitude=values(latitude),volume=values(volume),photolist=values(photolist);')
// var updateSchoolInfo = await query('insert into schools(name,xfzid) values' + schoolQueryValues + ' ON DUPLICATE KEY UPDATE name=values(name),xfzid=values(xfzid);')
// console.log(updateXfzInfo);
// console.log(updateSchoolInfo);