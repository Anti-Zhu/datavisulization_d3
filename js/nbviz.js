// 全局设置，使用crossfilter库创建过滤器

(function (nbviz) {
    'use strict';

    nbviz.data = {} // 空数据对象data
    nbviz.valuePerCapita = 0; // 标志，表示是否需要根据人口计算每个国家的奖项数量
    nbviz.activeCountry = null; // 选定的国家，在filterByCountries函数中修改
    nbviz.ALL_CATS = 'All Categories'; // 所有的类别
    nbviz.activeCategory = nbviz.ALL_CATS; // 选定的类别，在filterByCategory函数中修改
    nbviz.TRANS_DURATION = 2000; // 可视化效果转换的过渡时间
    nbviz.MAX_CENTROID_RADIUS = 30; //地图里圆点的最大半径
    nbviz.MIN_CENTROID_RADIUS = 2; // 地图里圆点的最小半径
    nbviz.COLORS = {
        palegold: '#E6BE8A'
    }; // 设置一个初始化的颜色对象

    // 获奖领域按照字母顺序排列
    nbviz.CATEGORIES = [
        "Physiology or Medicine", "Chemistry", "Economics", "Literature", "Peace", "Physics"
    ].sort((function (a, b) {
        if (a < b) {
            return 1;
        } else if (a > b) {
            return -1;
        }

        return 0;
    }));

    // 为每个领域设置一个颜色，hcl函数实现
    nbviz.categoryFill = function (category) {
        let i = nbviz.CATEGORIES.indexOf(category);
        return d3.hcl(i / nbviz.CATEGORIES.length * 360, 60, 70);
    };

    // nest()按照年份分组
    let nestDataByYear = function (entries) {
        return nbviz.data.years = d3.nest()
            .key(function (w) {
                return w.year;
            })
            .entries(entries);
    };

    // makeFilterAndDimensions函数使用crossfilter库创建过滤器
    nbviz.makeFilterAndDimensions = function (winnersData) {
        // 将winnersData数据集转换为一个crossfilter实例
        nbviz.filter = crossfilter(winnersData);

        // dimention()函数创建不同维度
        nbviz.countryDim = nbviz.filter.dimension(function (o) {
            return o.country;
        });

        nbviz.categoryDim = nbviz.filter.dimension(function (o) {
            return o.category;
        });

        nbviz.genderDim = nbviz.filter.dimension(function (o) {
            return o.gender;
        });
    };

    // filterByCountries函数根据国家名字过滤数据
    nbviz.filterByCountries = function (countryNames) {
        if (!countryNames.length) {
            nbviz.countryDim.filter();
        } else {
            nbviz.countryDim.filter(function (name) {
                return countryNames.indexOf(name) > -1;
            });
        }

        if (countryNames.length === 1) {
            nbviz.activeCountry = countryNames[0];
        } else {
            nbviz.activeCountry = null;
        }
    };

    // filterByCategory函数根据领域过滤数据
    nbviz.filterByCategory = function (cat) {
        nbviz.activeCategory = cat;

        if (nbviz.activeCategory === nbviz.ALL_CATS) {
            nbviz.categoryDim.filter();
        } else {
            nbviz.categoryDim.filter(nbviz.activeCategory);
        }
    };

    // getCountryData函数计算获奖数/人口，valuePerCapita为0时不计算
    nbviz.getCountryData = function () {
        // countryDim.group()返回一个对象，包含所有国家的数据
        let countryGroups = nbviz.countryDim.group().all();

        // map()函数返回一个新数组，数组中的元素为原始数组元素调用函数处理后的值
        let data = countryGroups.map(function (c) {
                // c.key为国家名字，c.value为获奖数
                let cData = nbviz.data.countryData[c.key];
                let value = c.value;
                // 如果valuePerCapita为0，不计算
                if (nbviz.valuePerCapita) {
                    value = value / cData.population;
                }

                return {
                    key: c.key, // 国家
                    value: value, // 获奖数/人口
                    code: cData.alpha3Code, // 三位国家代码
                    population: cData.population // 人口
                };
            })
            // 按照value值的大小排序
            .sort(function (a, b) {
                return b.value - a.value;
            });

        return data;
    };

    // 数据更新
    nbviz.onDataChange = function () {
        let data = nbviz.getCountryData();
        nbviz.updateBarChart(data);
        nbviz.updateMap(data);
        data = nestDataByYear(nbviz.countryDim.top(Infinity));
        nbviz.updateTimeChart(data);
    };

}(window.nbviz = window.nbviz || {}));