// 地图可视化

(function (nbviz) {
    'use strict';

    // 创建svg元素
    const mapContainer = d3.select('#nobel-map');
    const boundingRect = mapContainer.node().getBoundingClientRect();
    const width = boundingRect.width;
    const height = boundingRect.height;

    const svg = mapContainer.append('svg').attr('height', height).attr('width', width);

    /* 地图投影参数设置：
        * 1. scalefactor: 线性比例尺
        * 2. center: 地图中心点
        * 3. translate: 投影中心点在svg中的位置（480, 250）
        * 4. precision: 精度
     */
    const projection = d3.geoEquirectangular().scale(193 * (height / 480)).center([15, 15])
        .translate([width / 2, height / 2]).precision(.1);

    // path: 路径生成器
    const path = d3.geoPath().projection(projection);

    // graticule: 地图网格
    const graticule = d3.geoGraticule().step([20, 20]);


    // 画网格&对应的css类名设置
    svg.append('path').datum(graticule).attr('class', 'graticule').attr('d', path);

    // 画边界
    const radiusScale = d3.scaleSqrt().range([nbviz.MIN_CENTROID_RADIUS, nbviz.MAX_CENTROID_RADIUS]);

    // 用于存储国家名和对应的国家
    const cnameToCountry = {};

    // 用于存储国家名和对应的中心点
    const getCentroid = function (d) {
        const latlng = nbviz.data.countryData[d.name].latlng;
        return projection([latlng[1], latlng[0]]); // 存储的数据对象中的经纬度顺序和d3中的相反
    }

    // 初始化地图
    nbviz.initMap = function(world, countryNames) {
        // topojson.feature函数提取陆地&边界
        const land = topojson.feature(world, world.objects.land);
        const countries = topojson.feature(world, world.objects.countries).features;
        // topojson.mesh函数提取国家间的边界
        const borders = topojson.mesh(world, world.objects.countries, function(a, b) {
            return a !== b;
        });

        // 画陆地&对应的css类名设置
        svg.insert('path', '.graticule').datum(land).attr('class', 'land').attr('d', path);

        // 画国家&对应的css类名设置
        svg.insert('g', '.graticule').attr('class', 'countries');

        // 画国家中心点&对应的css类名设置
        svg.insert('g').attr('class', 'centroids');

        // 画国家边界&对应的css类名设置
        svg.insert('path', '.graticule')
            .datum(borders).attr('class', 'boundary').attr('d', path);

        // 按照国家id存储国家
        const idToCountry = {};

        countries.forEach(function (c) {
            idToCountry[c.id] = c;
        });

        // 按照国家名存储国家
        countryNames.forEach(function (n) {
            cnameToCountry[n.name] = idToCountry[n.id];
        });
    }

    // tooltip用于交互效果的设置
    const tooltip = d3.select('#map-tooltip');

    // 更新地图
    nbviz.updateMap = function (countryData) {

        //mapData存储筛选后的数据
        const mapData = countryData.filter(function (d) {
            return d.value > 0;
        })
        .map(function (d) {
            return {
                geo: cnameToCountry[d.key],
                name: d.key,
                number: d.value,
                population: d.population
            };
        });

        const maxWinners = d3.max(mapData.map(function (d) {
            return d.number;
        }));

        // 根据获奖人数设置圆点半径
        radiusScale.domain([0, maxWinners]);

        // 对country数据绑定
        const countries = svg.select('.countries').selectAll('.country').data(mapData, function (d) {
            return d.name;
        });

        countries.enter().append('path').attr('class', 'country').on('mouseenter', function(d) {
            const country = d3.select(this);

            // 如果国家不可见，不显示tooltip
            if (!country.classed('visible')) { return; }

            const cData = country.datum();

            const winnerValue = (nbviz.valuePerCapita) ? Math.floor(cData.number * cData.population) : cData.number;

            const prize_string = (cData.number === 1) ? ' prize in ' : ' prizes in ';

            const textColor = (nbviz.activeCategory === nbviz.ALL_CATS) ? 'goldenrod' : nbviz.categoryFill(nbviz.activeCategory);

            tooltip.select('h2').text(cData.name);
            tooltip.select('p').text(winnerValue + prize_string + nbviz.activeCategory).style('color', textColor);

            // 设置tooltip的位置
            const mouseCoords = d3.mouse(this);

            const w = parseInt(tooltip.style('width'));
            const h = parseInt(tooltip.style('height'));
            tooltip.style('top', (mouseCoords[1] - h) + 'px');
            tooltip.style('left', (mouseCoords[0] - w / 2) + 'px');

            d3.select(this).classed('active', true);
        }).on('mouseout', function (d) {
            tooltip.style('left', '-9999px');

            d3.select(this).classed('active', false);
        })
        .merge(countries)
        .attr('name', function (d) {
            return d.name;
        }).classed('visible', true)
        .transition().duration(nbviz.TRANS_DURATION)
        .style('opacity', 1)
        .attr('d', function (d) {
            return path(d.geo);
        });

        countries.exit().classed('visible', false).transition().duration(nbviz.TRANS_DURATION).style('opacity', 0);

        const centroids = svg.select('.centroids').selectAll('.centroid').data(mapData, function (d) {
            return d.name;
        });

        // 渲染和更新国家中心点
        const centroidColor = (nbviz.activeCategory === nbviz.ALL_CATS) ? 'goldenrod' : nbviz.categoryFill(nbviz.activeCategory);

        centroids.enter().append('circle').attr('class', 'centroid').merge(centroids)
            .attr('name', function (d) {
                return d.name;
            })
            .attr('cx', function (d) {
                return getCentroid(d)[0];
            })
            .attr('cy', function (d) {
                return getCentroid(d)[1];
            })
            .classed('active', function (d) {
                return d.name === nbviz.activeCountry;
            })
            .transition().duration(nbviz.TRANS_DURATION)
            .style('opacity', 1)
            .attr('r', function (d) {
                return radiusScale(+d.number)
            }).style('fill', centroidColor);

        centroids.exit().transition().duration(nbviz.TRANS_DURATION).style('opacity', 0);
    };

} (window.nbviz = window.nbviz || {}));