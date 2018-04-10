// Gradient line （折线图渐变色）
$(() => {
    ((username, password) => {
        const auth = "Basic " + btoa(`${username}:${password}`);

        // var dateList, valueList;
        const line_chart = echarts.init(document.getElementById('line'), 'dark');

        window.resizeLineChart = line_chart.resize;

        let option = {
            backgroundColor: 'rgba(0, 0, 7, 0.6)',
            // Make gradient line here
            visualMap: [{
                show: false,
                type: 'continuous',
                seriesIndex: 0,
                min: 0,
                max: 400
                // }, {
                //     show: false,
                //     type: 'continuous',
                //     seriesIndex: 1,
                //     dimension: 0,
                //     min: 0,
                //     max: dateList.length - 1
            }],
            tooltip: {
                trigger: 'axis',
                formatter: ([{ data } = line] = params) => {
                    let [percent, time] = data;
                    console.info(percent);
                    return percent;
                }
            },
            dataset: {
                sourceHeader: false,
                dimensions: [
                    { type: "time" },
                    { type: "number" }
                ]
            },
            xAxis: [{
                type: 'time',
                // data: dateList
                // }, {
                //     data: dateList,
                //     gridIndex: 1
            }],
            yAxis: [{
                splitLine: {
                    show: false
                }
                // }, {
                //     splitLine: {
                //         show: false
                //     },
                //     gridIndex: 1
            }],
            grid: {
                left: '3%',
                right: '3%',
                top: '6%',
                bottom: '14%'
            },
            series: [{
                type: 'line',
                areaStyle: {
                    normal: {
                        color: new echarts.graphic.LinearGradient(1, 0, 0, 1, [{
                            offset: 0,
                            color: '#1254d5'
                        }, {
                            offset: 1,
                            color: '#4ee151'
                        }])
                    }
                },
                label: {
                    normal: {
                        textStyle: {
                            color: '#fff'
                        }
                    }
                },
                encode: {
                    x: 1,
                    y: 0
                }
                // }, {
                //     type: 'line',
                //     data: valueList,
                //     xAxisIndex: 1,
                //     yAxisIndex: 1
            }]
        }

        const fields = {
            cpu: "cpu/cpu_idle",
            disk: "disk/disk_free",
            memory: "memory/mem_free"
        }

        function show_line(host, field) {
            let time = parseInt(Date.now() / 1000);

            $.ajax({
                url: `/api/v1/clusters/${cluster}/hosts/${host}`,
                dataType: "json",
                data: {
                    fields: `metrics/${fields[field]}[${time - 3600},${time},10]`
                },
                headers: {
                    Authorization: auth
                }
            }).then(({ metrics } = data) => {
                let source =
                    "cpu" === field ? metrics.cpu.cpu_idle : (
                        "disk" === field ? metrics.disk.disk_free : (
                            "memory" === field ? metrics.memory.mem_free : (
                                [])));

                option.dataset.source = source.map(v => { return [v[0], v[1] * 1000] });
                line_chart.setOption(option);
                line_chart.resize({ height: 130 });
                window.line_height = 130;
            });
        }

        window.show_line = show_line;
    })('admin', 'admin');
});
