// 数据加载和初始化

// d3.queue()函数异步加载4个数据文件
d3.queue()
    //数据包括：世界地图、各国诺贝尔奖计数&国名、各国数据、诺贝尔奖获奖者数据
    .defer(d3.json, "data/world_110m.json")    //topojson格式的世界地图数据，比例尺为110m
    .defer(d3.csv, "data/country_nobel_num.csv")
    .defer(d3.json, "data/country_info.json")
    .defer(d3.json, "data/laureates.json")
    .await(ready);

// ready函数：数据加载完成后执行初始化操作
function ready(error, worldMap, countryNames, countryData, winnersData) {
    // 出现错误时记录错误信息
    if (error) {
        return console.warn(error);
    }

    // 存储countryData数据
    nbviz.data.countryData = countryData;
    // 使用winnerData数据对象创建过滤器
    nbviz.makeFilterAndDimensions(winnersData);
    // 初始化菜单和地图
    nbviz.initMenu();
    nbviz.initMap(worldMap, countryNames);
    // onDataChange方法完成数据更新
    nbviz.onDataChange();

    setTimeout(function () {
        d3.select('.loading').attr('class', 'loaded');
        d3.select('body').attr('class', '');
    }, 3000);
}