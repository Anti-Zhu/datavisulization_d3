// 菜单和筛选器

(function (nbviz) {
    'use strict';

    // 所有领域
    const catList = [nbviz.ALL_CATS].concat(nbviz.CATEGORIES);
    const catSelect = d3.select('#cat-select select');

    catSelect.selectAll('option').data(catList).enter().append('option').attr('value', function (d) {
        return d;
    }).html(function (d) {
        return d;
    });

    // 领域改变时，筛选数据
    catSelect.on('change', function (d) {
        const category = d3.select(this).property('value');
        nbviz.filterByCategory(category);
        nbviz.onDataChange();
    });

    d3.select('#gender-select select').on('change', function (d) {
        const gender = d3.select(this).property('value');

        if (gender == 'All') {
            nbviz.genderDim.filter();
        } else {
            nbviz.genderDim.filter(gender);
        }

        nbviz.onDataChange();
    });


    // 下拉菜单
    nbviz.initMenu = function () {
        const ALL_WINNERS = 'All Winners';
        const SINGLE_WINNERS = 'Single Winning Countries';
        const DOUBLE_WINNERS = 'Double Winning Countries';

        // 获奖数从高到低排序
        const nats = nbviz.countryDim.group().all().sort(function (a, b) {
            return b.value - a.value;
        });

        // fewWinners对象，key为获奖数，value为国家名字
        let fewWinners = {
            1: [],
            2: []
        };
        let selectData = [ALL_WINNERS];

        // 将获奖数大于等于3的国家名字放入selectData数组中
        // 将获奖数为1和2的国家名字放入fewWinners对象中
        nats.forEach(function (o) {
            if (o.value >= 3) {
                selectData.push(o.key);
            } else {
                fewWinners[o.value].push(o.key);
            }
        });

        selectData.push(DOUBLE_WINNERS, SINGLE_WINNERS);

        // 国家筛选
        const countrySelect = d3.select('#country-select select');

        countrySelect.selectAll('option').data(selectData).enter().append('option').attr('value', function (d) {
            return d;
        }).html(function (d) {
            return d;
        });

        countrySelect.on('change', function (d) {
            let countries;

            let country = d3.select(this).property('value');

            if (country === ALL_WINNERS) {
                countries = [];
            } else if (country === DOUBLE_WINNERS) {
                countries = fewWinners[2];
            } else if (country === SINGLE_WINNERS) {
                countries = fewWinners[1];
            } else {
                countries = [country];
            }

            nbviz.filterByCountries(countries);
            nbviz.onDataChange();
        });

        // 按人均获奖数筛选
        d3.selectAll('#metric-radio input').on('change', function () {
            const val = d3.select(this).property('value');
            nbviz.valuePerCapita = parseInt(val);
            nbviz.onDataChange();
        });
    }
}(window.nbviz = window.nbviz || {}));