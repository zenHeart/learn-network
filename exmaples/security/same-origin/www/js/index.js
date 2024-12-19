document.getElementById("title").style.color="blue";
$.ajax({
    url: 'http://localhost:8001/js/other-origin.js',
    type: 'GET',
    async:false,
    success: function(data){ 
    },
    error: function() {
        alert('采用 ajax 加载非同源脚本,浏览器会报错:'+
        "\n但可采用 script 进行非同源脚本加载,点击查看效果!");
    }
});


$.ajaxSetup({async:false});
$.getScript('http://localhost:8001/js/other-origin.js',function() {
    alert('采用 script 加载脚本,执行成功!');
});