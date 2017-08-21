$(function () {

    // //1.初始化Table
    // var oTable = new TableInit();
    // oTable.Init();

    // //2.初始化Button的点击事件
    // var oButtonInit = new ButtonInit();
    // oButtonInit.Init();


    //1、初始化表格
    tableInit.Init();

    //2、注册增删改事件
    operate.operateInit();
});

//初始化表格
var tableInit = {
    Init: function () {
        //绑定table的viewmodel
        this.myViewModel = new ko.bootstrapTableViewModel({
            url: '/xfzlocal/getAdmin',         //请求后台的URL（*）
            method: 'post',                      //请求方式（*）
            toolbar: '#toolbar',                //工具按钮用哪个容器
            queryParams: function (params) {
                return {   //这里的键的名字和控制器的变量名必须一直，这边改动，控制器也需要改成一样的
                    limit: params.limit,   //页面大小
                    offset: params.offset,  //页码
                    // adminname: $("#txt_search_departmentname").val(),
                    // xfzid: $("#txt_search_statu").val(),
                    search:params.search
                };
            },//传递参数（*）
            pagination: true,                   //是否显示分页（*）
            sidePagination: "server",           //分页方式：client客户端分页，server服务端分页（*）
            pageNumber: 1,                      //初始化加载第一页，默认第一页
            pageSize: 10,                       //每页的记录行数（*）
            pageList: [10, 25, 50, 100],        //可供选择的每页的行数（*）
        });
        ko.applyBindings(this.myViewModel, document.getElementById("tb_dept"));
    }
};



//操作
var operate = {
    //初始化按钮事件
    operateInit: function () {
        this.operateAdd();
        this.operateUpdate();
        this.operateDelete();
        this.AdminModel = {
            id: ko.observable(),
            name: ko.observable(),
            password: ko.observable()
        };
    },
    //新增
    operateAdd: function(){
        $('#btn_add').on("click", function () {
            $("#myModal").modal().on("shown.bs.modal", function () {
                var oEmptyModel = {
                    id: ko.observable(),
                    name: ko.observable(),
                    password: ko.observable()
                };
                ko.utils.extend(operate.AdminModel, oEmptyModel);
                ko.applyBindings(operate.AdminModel, document.getElementById("myModal"));
                operate.operateSave();
            }).on('hidden.bs.modal', function () {
                ko.cleanNode(document.getElementById("myModal"));
            });
        });
    },
    //编辑
    operateUpdate: function () {
        $('#btn_edit').on("click", function () {
            $("#myModal").modal().on("shown.bs.modal", function () {
                var arrselectedData = tableInit.myViewModel.getSelections();
                if (!operate.operateCheck(arrselectedData)) { return; }
                //将选中该行数据有数据Model通过Mapping组件转换为viewmodel
                ko.utils.extend(operate.AdminModel, ko.mapping.fromJS(arrselectedData[0]));
                ko.applyBindings(operate.AdminModel, document.getElementById("myModal"));
                operate.operateSave();
            }).on('hidden.bs.modal', function () {
                //关闭弹出框的时候清除绑定(这个清空包括清空绑定和清空注册事件)
                ko.cleanNode(document.getElementById("myModal"));
            });
        });
    },
    //删除
    operateDelete: function () {
        $('#btn_delete').on("click", function () {
            var arrselectedData = tableInit.myViewModel.getSelections();
            $.ajax({
                url: '/xfzlocal/deleteAdmin',
                type: "post",
                contentType: 'application/json',
                data: JSON.stringify(arrselectedData),
                success: function (data, status) {
                    alert(status);
                    tableInit.myViewModel.refresh();
                }
            });
        });
    },
    //保存数据
    operateSave: function () {
        $('#btn_submit').on("click", function () {
            //取到当前的viewmodel
            var oViewModel = operate.AdminModel;
            //将Viewmodel转换为数据model
            var oDataModel = ko.toJS(oViewModel);
            // var url = oDataModel.id?"insertAdmin":"updateAdmin";
            $.ajax({
                url: '/xfzlocal/updateAdmin',
                type: "post",
                data: oDataModel,
                success: function (data, status) {
                    alert(status);
                    tableInit.myViewModel.refresh();
                }
            });
        });
    },
    //数据校验
    operateCheck:function(arr){
        if (arr.length <= 0) {
            alert("请至少选择一行数据");
            return false;
        }
        if (arr.length > 1) {
            alert("只能编辑一行数据");
            return false;
        }
        return true;
    }
}



// var TableInit = function () {
//     var oTableInit = new Object();
//     //初始化Table
//     oTableInit.Init = function () {
//         $('#tb_departments').bootstrapTable({
//             url: '/GetAdmin',         //请求后台的URL（*）
//             method: 'get',                      //请求方式（*）
//             toolbar: '#toolbar',                //工具按钮用哪个容器
//             striped: true,                      //是否显示行间隔色
//             cache: false,                       //是否使用缓存，默认为true，所以一般情况下需要设置一下这个属性（*）
//             pagination: true,                   //是否显示分页（*）
//             sortable: false,                     //是否启用排序
//             sortOrder: "asc",                   //排序方式
//             queryParams: oTableInit.queryParams,//传递参数（*）
//             sidePagination: "server",           //分页方式：client客户端分页，server服务端分页（*）
//             pageNumber:1,                       //初始化加载第一页，默认第一页
//             pageSize: 10,                       //每页的记录行数（*）
//             pageList: [10, 25, 50, 100],        //可供选择的每页的行数（*）
//             search: true,                       //是否显示表格搜索，此搜索是客户端搜索，不会进服务端，所以，个人感觉意义不大
//             strictSearch: true,
//             showColumns: true,                  //是否显示所有的列
//             showRefresh: true,                  //是否显示刷新按钮
//             minimumCountColumns: 2,             //最少允许的列数
//             clickToSelect: true,                //是否启用点击选中行
//             height: 500,                        //行高，如果没有设置height属性，表格自动根据记录条数觉得表格高度
//             uniqueId: "ID",                     //每一行的唯一标识，一般为主键列
//             showToggle:true,                    //是否显示详细视图和列表视图的切换按钮
//             cardView: false,                    //是否显示详细视图
//             detailView: false,                   //是否显示父子表
//             columns: [{
//                 checkbox: true
//             }, {
//                 field: 'id',
//                 title: 'ID'
//             }, {
//                 field: 'name',
//                 title: '学校名(关键词)'
//             }, {
//                 field: 'xfzid',
//                 title: '小饭桌id'
//             }]
//         });
//     };

//     //得到查询的参数
//     oTableInit.queryParams = function (params) {
//         var temp = {   //这里的键的名字和控制器的变量名必须一直，这边改动，控制器也需要改成一样的
//             limit: params.limit,   //页面大小
//             offset: params.offset,  //页码
//             adminname: $("#txt_search_departmentname").val(),
//             xfzid: $("#txt_search_statu").val(),
//             search:params.search
//         };
//         return temp;
//     };
//     return oTableInit;
// };


var ButtonInit = function () {
    var oInit = new Object();
    var postdata = {};

    oInit.Init = function () {
        //初始化页面上面的按钮事件
    };

    return oInit;
};