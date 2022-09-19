'use strict';

const e = React.createElement;

let ros = null

class AppComponent extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            robotState: '-',
            connected: false,
            joint_goals: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
            joint_pos: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
            tracking: false
        }
    }
    name = 'React.js component'
    robotState = 'Stopped'
    hfe_upper = 1.45
    hfe_lower = -1.45
    connectToRosbridge = () => {
        try {
            ros = new ROSLIB.Ros({
                url: document.getElementById('rosbridge_address').value
            })
        } catch (ex) {
            console.log(ex)
            //
        }
        ros.on('connection', () => {
            console.log('Connected to websocket server.')
            this.setState({
                connected: true
            })
            let listener = new ROSLIB.Topic({
                ros : ros,
                name : '/joint_states',
                messageType : 'sensor_msgs/msg/JointState'
            });
            listener.subscribe((message) => {
                // console.log(message);
                this.updateJointPos(message);
            });
        })
        ros.on('error', function (error) {
            console.log('Error connecting to websocket server: ', error)
        })
        ros.on('close', () => {
            console.log('Connection to websocket server closed.')
            this.setState({
                connected: false
            })
        })
    }
    disconnectRosbridge = () => {
        ros.close()
    }
    updateJointPos = (message) =>{
        this.setState({
            joint_pos: message.position
        })
    }
    robotMoveLegs = () => {
        let topic = new ROSLIB.Topic({
            ros: ros,
            name: '/forward_position_controller/commands',
            messageType: 'std_msgs/msg/Float64MultiArray'
        })
        let msg = new ROSLIB.Message({
            data: this.state.joint_goals
        })
        topic.publish(msg)
        this.setState({
            robotState: 'joint goals published'
        })
    }
    robotStop = () => {
        let topic = new ROSLIB.Topic({
            ros: ros,
            name: '/turtle1/cmd_vel',
            messageType: 'geometry_msgs/msg/Twist'
        })
        
        let msg = new ROSLIB.Message({
            // linear: { x: 0 },
            angular: { z: 0 },
        })
        topic.publish(msg)
        this.setState({
            robotState: 'stopped'
        })
        //this.robotState = 'Stopped'
    }

    updateJointGoals = (i, goal) => {
        this.state.joint_goals[i] = parseFloat(goal);
        this.forceUpdate();
        if (this.state.tracking){
            this.robotMoveLegs();
        }
    }

    turnOnTracking = () =>{
        this.setState({tracking: true});
        this.forceUpdate();
        this.robotMoveLegs();
    }

    render() {
        return (
            <div>
                <div>
                    <h2>Solo12 ROS2 Control Web Interface</h2>
                </div>

                <div>
                    <label>Enter your rosbridge address</label>
                    <br />
                    <input type="text" id="rosbridge_address" />
                    <br />
                    {!this.state.connected && <button onClick={this.connectToRosbridge}>Connect</button>}
                    {this.state.connected && <button onClick={this.disconnectRosbridge}>Disconnect</button>}
                </div>

                <div>
                    <input type="radio" id="on" name="tracking" value="on" onClick={(event) => this.turnOnTracking()}/>
                    <label htmlFor="on">ON</label><br />
                    <input type="radio" id="off" name="tracking" value="off" onClick={(event) => this.setState({tracking: false})}/>
                    <label htmlFor="off">OFF</label><br />
                </div>
        
                <div class="slidecontainer">
                    <input type="range" min={this.hfe_lower} max={this.hfe_upper} defaultValue="0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(0,event.target.value)}></input>
                    <p>Joint goal: {this.state.joint_goals[0]} </p>
                    <p>Joint position: {this.state.joint_pos[8]} </p>
                </div>


                <div>
                    <h3>Robot actions</h3>
                    <p>Robot is {this.state.robotState}</p>
                    <button onClick={this.robotCircles}>Run in circles</button>
                    <br/>
                    <button onClick={this.robotStop}>Stop</button>
                </div>

            </div>
        )
    }
}

const appContainer = document.querySelector('#app')
ReactDOM.render(e(AppComponent), appContainer)