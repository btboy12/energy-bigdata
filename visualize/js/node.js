'use strict';
const cluster = "ambari";

function parseByte(byte) {
    const unit = ["KB", "MB", "GB"];
    for (var i = 0; byte > 1024; i++, byte /= 1024);
    return byte.toFixed(2) + unit[i];
}

((username, password) => {
    const auth = "Basic " + btoa(`${username}:${password}`);

    function getClusterInfo() {
        $.ajax({
            url: `/api/v1/clusters/${cluster}`,
            dataType: "json",
            data: {
                fields: "Clusters"
            },
            headers: {
                Authorization: auth
            }
        }).then(({
            Clusters
        } = data) => {
            const dict = ["cluster_name", "provisioning_state", "version"];
            app.cluster = dict.map(v => {
                return {
                    name: v,
                    value: Clusters[v]
                }
            });
        });
    }
    getClusterInfo();

    const interval_query = {
        host: "",
        param: "cpu",
    }

    function interval_func() {
        if (interval_query.host) {
            $.ajax({
                url: `/api/v1/clusters/${cluster}/hosts/${interval_query.host}`,
                dataType: "json",
                data: {
                    fields: [
                        "cpu/cpu_idle",
                        "memory/mem_free"
                    ].map(str => "metrics/" + str).join(",")
                },
                headers: {
                    Authorization: auth
                }
            }).then(({
                metrics: {
                    cpu: {
                        cpu_idle
                    },
                    memory: {
                        mem_free
                    }
                }
            } = data) => {
                app.metrics = {
                    cpu_usage: (100 - cpu_idle).toFixed(1) + "%",
                    mem_free: parseByte(mem_free)
                }
            });

            show_line(interval_query.host, interval_query.param);
        }
    }

    setInterval(interval_func, 10000);

    function getHostInfo(host_name) {
        $("#choose_node").val(host_name);
        $.ajax({
            url: `/api/v1/clusters/${cluster}/hosts/${host_name}`,
            dataType: "json",
            data: {
                fields: "Hosts,metrics"
            },
            headers: {
                Authorization: auth
            }
        }).then(({
            Hosts
        } = data) => {
            app.summary = {
                hostname: Hosts.host_name,
                ip: Hosts.ip,
                rack: Hosts.rack_info,
                os: Hosts.os_type,
                cores: Hosts.cpu_count,
                disk: Hosts.disk_info,
                memory: parseByte(Hosts.total_mem)
            }
        });
        interval_query.host = host_name;

        // window.show_line();
    }

    const app = new Vue({
        el: "#platform",
        data: {
            nodes: [],
            summary: {
                hostname: null,
                ip: null,
                rack: null,
                os: null,
                cores: null,
                disk: null,
                memory: null
            },
            metrics: {
                cpu_usage: null,
                mem_free: null
            },
            host: null,
            component: null
        },
        methods: {
            selectNode(e) {
                getHostInfo(e.target.value);
                app.data.component = null;
            },
            parseByte
        },
        watch: {
            summary: {
                handler: () => {
                    app.$nextTick(function () {
                        myscroll.refresh();
                    })
                },
                deep: true
            }
        }
    });

    $(document).ready(function () {
        $("#choose_param").select2();

        $('#choose_param').on('select2:select', function ({
            params: {
                data: {
                    id
                }
            }
        } = e) {
            interval_query.param = id;
            interval_func();
        });
        window.myscroll = new IScroll("#menu", {
            mouseWheel: true
        });

        const myChart = echarts.init(document.getElementById('node_hosts'), "default", {
            height: window.innerHeight - 94
        });

        $(window).resize(() => {
            myChart.resize({
                height: window.innerHeight - 94 - (window.line_height || 0)
            });
            resizeLineChart()
        })

        myChart.showLoading();

        let chart_data = {
            name: "cluster",
            children: []
        }

        let option = {
            // backgroundColor: '#1b1b1b',
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove'
            },
            series: [{
                type: 'tree',
                // type: 'treemap',

                data: [chart_data],

                left: '100',
                right: '100',
                top: '100',
                bottom: '100',

                layout: 'radial',

                symbol: 'emptyCircle',

                symbolSize: 9,

                initialTreeDepth: 2,

                animationDurationUpdate: 750,

                label: {
                    normal: {
                        textStyle: {
                            color: '#fff'
                        }
                    }
                }

            }]
        }
        $.ajax({
            url: `/api/v1/clusters/${cluster}/hosts`,
            dataType: "json",
            data: {
                fields: "Hosts/host_name,Hosts/rack_info"
            },
            headers: {
                Authorization: auth
            }
        }).done(function (data) {
            $("#choose_node").select2({
                data: data.items.map(item => {
                    return {
                        id: item.Hosts.host_name,
                        text: item.Hosts.host_name
                    }
                })
            }).on("select2:select", event => {
                getHostInfo(event.params.data.id);
                myChart.resize({
                    height: window.innerHeight - 94 - 130
                });
                interval_func();
            });

            let struct = data.items.reduce((struct, item) => {
                if (struct[item.Hosts.rack_info]) {
                    struct[item.Hosts.rack_info].push({
                        name: item.Hosts.host_name,
                        value: item.Hosts.host_name
                    });
                } else {
                    struct[item.Hosts.rack_info] = [{
                        name: item.Hosts.host_name,
                        value: item.Hosts.host_name
                    }];
                }
                return struct;
            }, {});

            for (var i in struct) {
                chart_data.children.push({
                    name: i,
                    children: struct[i]
                })
            }

            myChart.hideLoading();
            myChart.setOption(option, true);
        });

        // 点击事件
        myChart.on('click', params => {
            if (params.value) {
                getHostInfo(params.value);
                myChart.resize({
                    height: window.innerHeight - 94 - 130
                });
                interval_func();
            }
        });

        new Swiper('#container', {
            direction: "vertical",
            simulateTouch: false,
            mousewheel: true
            // touchMoveStopPropagation: false,
            // preventClicksPropagation: false,
            // setWrapperSize: true
        });


    });
})('admin', 'admin');