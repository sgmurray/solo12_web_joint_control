'use strict';

const e = React.createElement;

let ros = null

class AppComponent extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            robotState: '-',
            connected: false,
            joint_goals: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
            joint_pos: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
            cartesian_goals: [-0.2, 0.045, 0.0, -0.2, 0.045, 0.0, -0.2, 0.045, 0.0, -0.2, 0.045, 0.0],
            tracking: false,
            controller: 'position',
            input: 'joint_angles'
        }
    }
    name = 'React.js component'
    robotState = 'Stopped'
    HAA_upper = 0.9
    HAA_lower = -0.9
    HFE_upper = 1.45
    HFE_lower = -1.45
    KFE_upper = 2.8
    KFE_lower = -2.8
    joint_upper_limits = [this.HAA_upper, this.HFE_upper, this.KFE_upper, this.HAA_upper, this.HFE_upper, this.KFE_upper, this.HAA_upper, this.HFE_upper, this.KFE_upper, this.HAA_upper, this.HFE_upper, this.KFE_upper]
    joint_lower_limits = [this.HAA_lower, this.HFE_lower, this.KFE_lower, this.HAA_lower, this.HFE_lower, this.KFE_lower, this.HAA_lower, this.HFE_lower, this.KFE_lower, this.HAA_lower, this.HFE_lower, this.KFE_lower]
    joint_names = ['FL_HAA', 'FL_HFE', 'FL_KFE', 'FR_HAA', 'FR_HFE', 'FR_KFE', 'HL_HAA', 'HL_HFE', 'HL_KFE', 'HR_HAA', 'HR_HFE', 'HR_KFE']
    joint_remaps = [8, 0, 2, 1, 9, 3, 4, 5, 10, 6, 7, 11]
    leg_cartesian_names = ['FL_X', 'FL_Y', 'FL_Z']
    x_upper = -0.1
    x_lower = -0.32
    x_default = (this.x_upper + this.x_lower) / 2
    z_upper = 0.1
    z_lower = -0.1
    z_default = (this.z_upper + this.z_lower) / 2
    y_lower = 0.01
    y_upper = 0.08
    y_default = (this.y_upper + this.y_lower) / 2
    cartesian_lower_limits = [this.x_lower, this.y_lower, this.z_lower]
    cartesian_upper_limits = [this.x_upper, this.y_upper, this.z_upper]
    cartesian_defaults = [this.x_default, this.y_default, this.z_default]
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
    publishPositionGoal = () => {
        let topic = new ROSLIB.Topic({
            ros: ros,
            name: '/forward_position_controller/commands',
            messageType: 'std_msgs/msg/Float64MultiArray'
        })
        console.log(this.state.joint_goals)
        let msg = new ROSLIB.Message({
            data: this.state.joint_goals
        })
        topic.publish(msg)
        this.setState({
            robotState: 'joint goals published'
        })
    }
    publishTrajectoryGoal = () => {
        let topic = new ROSLIB.Topic({
            ros: ros,
            name: '/position_trajectory_controller/joint_trajectory',
            messageType: 'trajectory_msgs/msg/JointTrajectory'
        })
        let msg = new ROSLIB.Message({
            joint_names : this.joint_names,
            points :  [{positions: this.state.joint_goals , time_from_start : {sec: 3.0}}]
        })
        topic.publish(msg)
        console.log(this.state.joint_goals)
        console.log("Published joint trajectory YOLO")
    }

    robotMoveLegs = () => {
        if (this.state.controller == 'position'){
            this.publishPositionGoal();
        }
        else if (this.state.controller == 'trajectory'){
            this.publishTrajectoryGoal();
        }
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
        this.state.joint_goals[i] = parseFloat(goal) + 0.001;
        //this.state.joint_goals[i] = parseFloat((Math.round(goal * 100) / 100).toFixed(2))
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

    computeIK = (x,y,z) => {
        let LL = 0.16
        let offset = 0.05945
        let origin_2_foot_length = Math.sqrt(x**2 + y**2)

        let t1 = -Math.atan2(x,y) - Math.acos(offset / origin_2_foot_length)

        let p1 = [-offset * Math.sin(t1), offset * Math.cos(t1), 0]
        let end = [x, y, z]
        let p1_2_end = [end[0] - p1[0], end[1] - p1[1], end[2] - p1[2]]

        let new_x = Math.cos(t1) * p1_2_end[0] + Math.sin(t1) * p1_2_end[1]
        let new_z = end[2]
        let little_r = Math.sqrt(new_x**2 + new_z**2)

        let t2_leg_coords = Math.atan2(new_x, new_z) - Math.acos(little_r**2 / (2 * little_r * LL) )

        let t2 = t2_leg_coords + Math.PI / 2.0

        let t3 = Math.atan2(new_x - LL * Math.sin(t2_leg_coords), new_z - LL * Math.cos(t2_leg_coords)) - t2_leg_coords

        return [t1, t2, t3]
        
    }

    updateCartesianGoals = (i, goal) => {
        this.state.cartesian_goals[i] = parseFloat((Math.round(goal * 100) / 100).toFixed(3))
        let angles = this.computeIK(this.state.cartesian_goals[0], this.state.cartesian_goals[1], this.state.cartesian_goals[2])
        console.log("goals " + this.state.cartesian_goals[0] + " " + this.state.cartesian_goals[1] + " " + this.state.cartesian_goals[2])

        this.state.joint_goals[0] = angles[0]
        this.state.joint_goals[1] = angles[1]
        this.state.joint_goals[2] = angles[2]
        console.log(angles)        
        //this.state.joint_goals[i] = parseFloat((Math.round(goal * 100) / 100).toFixed(2))
        this.forceUpdate();
        if (this.state.tracking){
            this.robotMoveLegs();
        }
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
                    <input type="radio" id="off" name="tracking" value="off" defaultChecked onClick={(event) => this.setState({tracking: false})}/>
                    <label htmlFor="off">OFF</label><br /> 
                </div>

                <div>
                    <input type="radio" id="on" name="controller" value="trajectory" onClick={(event) => this.setState({controller: 'trajectory'})}/>
                    <label htmlFor="on">Trajectory</label><br />
                    <input type="radio" id="off" name="controller" value="position" defaultChecked onClick={(event) => this.setState({controller: 'position'})}/>
                    <label htmlFor="off">Position</label><br /> 
                </div>

                <div>
                    <input type="radio" id="on" name="input" value="joint_angles" defaultChecked onClick={(event) => this.setState({input: 'joint_angles'})}/>
                    <label htmlFor="on">Joint Angles</label><br />
                    <input type="radio" id="off" name="input" value="cartesian" onClick={(event) => this.setState({input: 'cartesian'})}/>
                    <label htmlFor="off">Cartesian Foot Position</label><br /> 
                </div>



                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[0]} max={this.joint_upper_limits[0]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(0,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[0]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[0] * 100) / 100).toFixed(2)}</p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[0]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[1]} max={this.joint_upper_limits[1]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(1,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[1]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[1] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[1]] * 100) / 100).toFixed(2)} </p>
                </div> 
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[2]} max={this.joint_upper_limits[2]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(2,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[2]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[2] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[2]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[3]} max={this.joint_upper_limits[3]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(3,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[3]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[3] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[3]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[4]} max={this.joint_upper_limits[4]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(4,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[4]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[4] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[4]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[5]} max={this.joint_upper_limits[5]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(5,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[5]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[5] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[5]] * 100) / 100).toFixed(2)} </p>
                </div>
                } 

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[6]} max={this.joint_upper_limits[6]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(6,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[6]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[6] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[6]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[7]} max={this.joint_upper_limits[7]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(7,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[7]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[7] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[7]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[8]} max={this.joint_upper_limits[8]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(8,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[8]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[8] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[8]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[9]} max={this.joint_upper_limits[9]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(9,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[9]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[9] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[9]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[10]} max={this.joint_upper_limits[10]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(10,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[10]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[10] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[10]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'joint_angles' &&
                <div className="slidecontainer">
                    <input type="range" min={this.joint_lower_limits[11]} max={this.joint_upper_limits[11]} defaultValue="0.0" class="slider" id="myRange" step="0.05" onChange={(event)=> this.updateJointGoals(11,event.target.value)}></input>
                    <p>Joint name: {this.joint_names[11]}</p>
                    <p>Joint goal: {(Math.round(this.state.joint_goals[11] * 100) / 100).toFixed(2)} </p>
                    <p>Joint position: {(Math.round(this.state.joint_pos[this.joint_remaps[11]] * 100) / 100).toFixed(2)} </p>
                </div>
                }

                {this.state.input == 'cartesian' &&
                <div className="slidecontainer">
                    <input type="range" min={this.cartesian_lower_limits[0]} max={this.cartesian_upper_limits[0]} defaultValue={this.cartesian_defaults[0]} class="slider" id="myRange" step="0.005" onChange={(event)=> this.updateCartesianGoals(0, event.target.value)}></input>
                    <p>Joint name: {this.leg_cartesian_names[0]}</p>
                    <p>Cartesian goal: {(Math.round(this.state.cartesian_goals[0] * 1000) / 1000).toFixed(3)} </p>
                    <p>Cartesian position: {(Math.round(this.state.joint_pos[this.joint_remaps[1]] * 1000) / 1000).toFixed(3)} </p>
                </div>
                }

                {this.state.input == 'cartesian' &&
                <div className="slidecontainer">
                    <input type="range" min={this.cartesian_lower_limits[1]} max={this.cartesian_upper_limits[1]} defaultValue={this.cartesian_defaults[1]} class="slider" id="myRange" step="0.005" onChange={(event)=> this.updateCartesianGoals(1, event.target.value)}></input>
                    <p>Joint name: {this.leg_cartesian_names[1]}</p>
                    <p>Cartesian goal: {(Math.round(this.state.cartesian_goals[1] * 1000) / 1000).toFixed(3)} </p>
                    <p>Cartesian position: {(Math.round(this.state.joint_pos[this.joint_remaps[1]] * 1000) / 1000).toFixed(3)} </p>
                </div>
                }

                {this.state.input == 'cartesian' &&
                <div className="slidecontainer">
                    <input type="range" min={this.cartesian_lower_limits[2]} max={this.cartesian_upper_limits[2]} defaultValue={this.cartesian_defaults[2]} class="slider" id="myRange" step="0.005" onChange={(event)=> this.updateCartesianGoals(2, event.target.value)}></input>
                    <p>Joint name: {this.leg_cartesian_names[2]}</p>
                    <p>Cartesian goal: {(Math.round(this.state.cartesian_goals[2] * 1000) / 1000).toFixed(3)} </p>
                    <p>Cartesian position: {(Math.round(this.state.joint_pos[this.joint_remaps[1]] * 1000) / 1000).toFixed(3)} </p>
                </div>
                }

               





                {/* <div>
                    <h3>Robot actions</h3>
                    <p>Robot is {this.state.robotState}</p>
                    <button onClick={this.robotCircles}>Run in circles</button>
                    <br/>
                    <button onClick={this.robotStop}>Stop</button>
                </div> */}

            </div>
        )
    }
}

const appContainer = document.querySelector('#app')
ReactDOM.render(e(AppComponent), appContainer)