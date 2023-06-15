// 时间+获奖情况图

(function (nbviz) {
    'use strict';

    // 画布的边距设置
    const chartHolder = d3.select('#nobel-time');
    const margin = {
        top: 0,
        right: 20,
        bottom: 50,
        left: 40
    };

    // 宽高设置
    const boundingRect = chartHolder.node().getBoundingClientRect();
    const width = boundingRect.width - margin.left - margin.right;
    const height = boundingRect.height - margin.top - margin.bottom;

    // 画布设置&避免两端超出
    const svg = chartHolder.append('svg').attr('height', height + margin.top + margin.bottom)
        .attr('width', width + margin.left + margin.right).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // 比例尺&坐标轴设置
    const MAX_WINNERS_PER_YEAR = 15
    const xScale = d3.scaleBand().range([0, width]).padding(0.1).domain(d3.range(1900, 2021));
    const yScale = d3.scalePoint().range([height, 60]).domain(d3.range(MAX_WINNERS_PER_YEAR));

    const xAxis = d3.axisBottom().scale(xScale).tickValues(xScale.domain().filter(function (d, i) {
        return !(d % 10); //标记哪些年份
    }));

    setTimeout(function () {
        // g元素组用于显示X轴的刻度线和标签
        svg.append('g').attr('class', 'xaxis').attr('transform', 'translate(0,' + height + ')')
            .call(xAxis).call(function (g) {
                return g.select('.domain').remove();
            }).selectAll('text').style('text-anchor', 'end').attr('dx', '-.8em').attr('dy', '.15em')
            .attr('transform', 'rotate(-65)').style('font-size', '1.2rem');

        // 显示每个类别的标签文本
        const catLabels = chartHolder.select('svg').append('g')
            .attr('transform', 'translate(10, 10)').attr('class', 'labels')
            .selectAll('label').data(nbviz.CATEGORIES) //在nbviz.js中定义
            .enter().append('g').attr('transform', function (d, i) {
                return 'translate(0,' + i * 16 + ')'; //实现标签的垂直排列
            });

        // 圆形标签+颜色
        catLabels.append('circle')
            .attr('fill', nbviz.categoryFill)
            .attr('r', xScale.bandwidth() / 1.5);

        //文本设置，text元素与circle元素的位置保持一致
        catLabels.append('text')
            .text(function (d) {
                return d;
            })
            .attr('dy', '.4em')
            .attr('x', 10)
            .style('font-size', '1.3rem');
    }, nbviz.TRANS_DURATION);

    // 悬停时的交互元素
    const tooltip = d3.select('#time-tooltip');
    const tooltipHeader = tooltip.select('h2');
    const tooltipWrapper = tooltip.select('.wrapper');

    nbviz.updateTimeChart = function (data) {
        data.forEach(function (d) {
            // 按照category进行排序
            d.values.sort(function (a, b) {
                if (a.category < b.category) {
                    return -1;
                } else if (a.category > b.category) {
                    return 1;
                }

                return 0;
            });
        });

        data.sort(function (a, b) {
            // 再按照key进行排序
            return b.key - a.key;
        });

        // 更新years的数据绑定
        const years = svg.selectAll('.year')
            .data(data, function (d) {
                return d.key;
            });

        // 为每个year添加一个g元素并绑定数据
        years.enter().append('g').on('mouseenter', function (d) {
                const year = d3.select(this);

                const yData = year.datum();

                const winners = {
                    'Physiology or Medicine': 0,
                    'Chemistry': 0,
                    'Physics': 0,
                    'Peace': 0,
                    'Literature': 0,
                    'Economics': 0
                };

                yData.values.forEach(function (data) {
                    winners[data.category] += 1;
                });

                tooltipHeader.text(yData.key);

                nbviz.CATEGORIES.forEach(function (c) {
                    let p = tooltipWrapper.append('p');

                    p.html('<span class="time-tooltip-circle" style="background-color:' + ((winners[c] == 0) ? '#999' : nbviz.categoryFill(c)) + '"></span>' +
                        winners[c] + ' ' + c);

                    if (winners[c] == 0) {
                        p.classed('empty', true);
                    } else {
                        p.classed('empty', false);
                    }
                });

                const mouseCoords = d3.mouse(d3.select('#nobel-time').node());

                const w = parseInt(tooltip.style('width'));
                const h = parseInt(tooltip.style('height'));

                if (mouseCoords[0] < w) {
                    tooltip.style('left', (mouseCoords[0]) + 'px');
                } else {
                    tooltip.style('left', (mouseCoords[0] - w) + 'px');
                }

                tooltip.style('top', (mouseCoords[1] - h * 1.25) + 'px');
            }).on('mouseout', function (d) {
                tooltipWrapper.selectAll('*').remove();
                tooltip.style('left', '-9999px');
            })
            .classed('year', true)
            .merge(years)
            .attr('name', function (d) {
                return d.key;
            })
            .attr('transform', function (year) {
                return "translate(" + xScale(+year.key) + ",-5)"; // 字符串转int
            });

        // 删除没有数据的year
        years.exit().remove();

        const winners = svg.selectAll('.year').selectAll('.winner').data(function (d) {
            return d.values;
        }, function (d) {
            return d.name;
        });

        /* 堆叠的实现：
        * 1.创建winners选择集
        * 2.给圆形元素添加一个名为"winner"的CSS类
        * 3.根据数据中每个元素的分类属性，设置圆形元素的填充颜色
        * 4.将圆形元素的圆心坐标cy设置为画布高度，即初始状态下它们都在画布底部
        * 5.将圆形元素的圆心坐标cx设置为xScale.bandwidth() / 2，即它们都在各自的x轴刻度中间
        * 6.将圆形元素的半径r设置为xScale.bandwidth() / 2，即它们的大小与x轴刻度的宽度相等
        * 7.使用merge()方法将新添加的元素与已有的元素合并，并在之后的动画中对它们一起进行处理
        * 8.使用transition()方法开始动画，并设置动画持续时间为nbviz.TRANS_DURATION
        * 9.将圆形元素的cy属性从初始值逐渐变为yScale(i)，即它们在y轴上的位置逐渐上移，直到到达各自的位置*/

        /*winners.enter().append('circle').classed('winner', true)
            .attr('fill', function (d) {
                return nbviz.categoryFill(d.category);
            })
            .attr('cy', height)
            .attr('cx', xScale.bandwidth() / 2)
            .attr('r', xScale.bandwidth() / 2)
            .merge(winners)
            .transition().duration(nbviz.TRANS_DURATION)
            .attr('cy', function (d, i) {
                return yScale(i);
            });*/
        winners.enter().append('rect').classed('winner', true)
            .attr('fill', function (d) {
                return nbviz.categoryFill(d.category);
            })
            .attr('y', height)
            .attr('x', 0)
            .attr('width', xScale.bandwidth())
            .attr('height', xScale.bandwidth())
            .merge(winners)
            .transition().duration(nbviz.TRANS_DURATION)
            .attr('y', function (d, i) {
                return yScale(i);
            });

        winners.exit().remove();
    };

}(window.nbviz = window.nbviz || {}));