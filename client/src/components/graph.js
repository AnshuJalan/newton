import React, { Component } from 'react';
import CoinbasePro from 'coinbase-pro';

import CanvasJSReact from '../addon/canvasjs.react';

var CanvasJS = CanvasJSReact.CanvasJS;
var CanvasJSChart = CanvasJSReact.CanvasJSChart;
  
const publicClient = new CoinbasePro.PublicClient();

class Graph extends Component {

    state = {
        data: []
    }


    componentDidMount = async () => {
        try {
            const data = await this.getChartData();

            this.setState({  data });
        } catch (error) {
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    getChartData = async () => {
        try {
            const val = await publicClient.getProductHistoricRates('ETH-USD', {
                start: new Date(Date.now() - 1.5 * 86400 * 1000).toISOString(),
                end: new Date(Date.now() - 2*3600 * 1000).toISOString(),
                granularity: 3600
            });

            let data = []

            for (let i = 0; i < val.length; i++) {
                let point = val[i]
                let color;

                if (point[3] < point[4])
                    color = "green"
                else
                    color = "red"

                let newPoint = { x: new Date(point[0] * 1000), y: [point[3], point[2], point[1], point[4]], color: color }
                data.push(newPoint)
            }

            data.reverse();

            return data;
        } catch (err) {
            console.log(err);
        }
    }

    render() {
        return (
            <div className="sec-bg graph container">
                {this.state.data.length > 0 &&
                    <CanvasJSChart
                        options={{
                            theme: "dark2", // "light1", "light2", "dark1", "dark2"
                            animationEnabled: true,
                            exportEnabled: true,
                            title: {
                                text: "ETH/USD (Last 24 hours)"
                            },
                            height: "300",
                            axisX: {
                                valueFormatString: "HH:00",
                                labelFontColor: "#ffffff50",
                                gridColor: "#000000",
                                gridThickness: 1
                            },
                            axisY: {
                                includeZero: false,
                                prefix: "$",
                                labelFontColor: "#ffffff50",
                                gridColor: "#000000",
                            },
                            backgroundColor: "#242424",
                            data: [{
                                type: "candlestick",
                                risingColor: "green",
                                fallingColor: "red",
                                dataPoints: this.state.data
                            }]
                        }}
                    />
                }
            </div>
        );
    }
}

export default Graph;