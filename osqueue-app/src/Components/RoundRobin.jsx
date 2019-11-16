import React, { Component } from 'react';
import Process from './Process';
import Attendance from './Attendance';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import AutorenewIcon from '@material-ui/icons/Autorenew';

let count = 0;
const MAX_RANDOM = 8;
let attendanceInterval = null;
let queueProcessInterval = null;

export default class RoundRobin extends Component {
  constructor(props) {
    super(props);
    this.state = this._initialState();
  }

  _initialState = () => {
    return {
      paused: true,
      queueProcess: [], // Fila de processos em espera de atendimento
      attendance: [], // Fila de atendimento
      numberOfAttendances: 4,
      quantumTime: 0, // variável para auxiliar no gerenciamento do quantum
      quantumMaxTime: 10, // tempo máximo do quantum de processamento
      queueProcessLog: '',
      queueProcessLength: '',
      btnText: 'Run'
    };
  };

  /* 1) Função que cria novos processos e gerencia a entrada na fila de Processos */
  _managerQueueProccess = () => {
    queueProcessInterval = setInterval(() => {
      let { queueProcess, paused } = this.state;
      // Verifica o status do sistema
      if (!paused) {
        // Instancia novos processos
        let process = {
          id: '',
          timeCost: ''
        };
        // Random Processos a adicionar na Fila de Processos
        let random = Math.floor(Math.random() * MAX_RANDOM) + 1;
        // Adiciona os novos Processos
        for (let i = 0; i < random; ++i) {
          count += 1;
          process.id = count;
          process.timeCost = Math.floor(Math.random() * MAX_RANDOM) + 1;
          console.log('id: ' + process.id, 'cost: ' + process.timeCost);
          queueProcess.push(process);
        }
        // Seta o estado
        this.setState({
          queueProcess: queueProcess,
          queueProcessLog: this._getQueueProcessLogText(random),
          queueProcessLength: this._getQueueProcessLengthText()
        });
      }
    }, 5000);
  };

  /* 2) Função que gerencia os processos que serão atendidos */
  _managerAttendance = () => {
    let { queueProcess, paused, numberOfAttendances } = this.state;
    // Verifica se existe pelo menos 1 Processo na Fila de Processos
    if (!paused && queueProcess.length >= 1) {
      let loops =
        queueProcess.length < numberOfAttendances
          ? queueProcess.length
          : numberOfAttendances;
      // Adiciona Processos ao Atendimento
      let attendance = [];
      for (let i = 0; i < loops; ++i) {
        attendance.push(queueProcess[i]);
      }
      // remove os Processos em Atendimento da Fila de Processos
      queueProcess.splice(0, numberOfAttendances);
      // Seta o estado
      this.setState({
        queueProcess: queueProcess,
        attendance: attendance,
        queueProcessLength: this._getQueueProcessLengthText()
      });
    }
  };

  /* 3) Função que gerencia o atendimento de cada processo */
  _startAttendance = () => {
    let quantumTime = this.state.quantumMaxTime;
    let incTime = () => {
      let { paused } = this.state;
      if (!paused) {
        if (quantumTime === 0) {
          this._managerAttendance();
          quantumTime = this.state.quantumMaxTime;
        }
        this.setState({ quantumTime: quantumTime }, () => {});
        quantumTime -= 1;
      }
    };
    attendanceInterval = setInterval(incTime, 1000);
  };

  _getQueueProcessLogText = n => {
    let proccess = n === 1 ? 'Processo' : 'Processos';
    let entrou = n === 1 ? 'entrou' : 'entraram';
    return n + ' ' + proccess + ' ' + entrou + ' na Fila de Espera.';
  };

  _getQueueProcessLengthText = n => {
    let proccess = n === 1 ? 'Process' : 'Processs';
    return (
      'Total de ' +
      this.state.queueProcess.length +
      ' ' +
      proccess +
      ' na Fila de Espera.'
    );
  };

  _handlerBtnOnClick = () => {
    let paused = this.state.paused;
    let btnText = paused ? 'Pause System' : this._initialState().btnText;
    this.setState({
      paused: !paused,
      btnText: btnText
    });
  };

  _handlerRestartOnClick = () => {
    this.setState(this._initialState(), () => {
      count = 0;
      this.state.queueProcess.splice(0, this.state.queueProcess.length);
    });
  };

  _handlerInputOnChange = e => {
    if (e.target.value <= 1) {
      this.setState({ numberOfAttendances: 1 });
    } else {
      this.setState({ numberOfAttendances: e.target.value });
    }
  };

  _handlerInputquantumMaxTimeOnChange = e => {
    if (e.target.value <= 1) {
      this.setState({ quantumMaxTime: 1 });
    } else {
      this.setState({ quantumMaxTime: e.target.value });
    }
  };

  componentDidMount() {
    this._managerQueueProccess();
    this._startAttendance();
  }

  componentWillUnmount() {
    clearInterval(attendanceInterval);
    clearInterval(queueProcessInterval);
  }

  render() {
    return (
      <div className="container" style={{ marginTop: '10px' }}>
        <div className="d-inline-block" style={{ marginLeft: '5px' }}>
          <h3>UniFBV - RR Simulator</h3>
          <h4>
            {this.state.paused ? (
              <span className="badge badge-warning">Paused!!!</span>
            ) : (
              <span className="badge badge-success">
                System in Attendance ...
              </span>
            )}
          </h4>
        </div>

        {/* Botões */}
        <div className="float-md-right">
          <button
            className="btn btn-md btn-primary"
            onClick={this._handlerBtnOnClick}
            style={{ marginRight: '5px', marginTop: '3px' }}
          >
            {this.state.paused ? <PlayArrowIcon /> : <PauseIcon />}
            {this.state.btnText}
          </button>

          <button
            className="btn btn-md btn-danger"
            onClick={this._handlerRestartOnClick}
            style={{ marginRight: '5px', marginTop: '3px' }}
          >
            <AutorenewIcon /> Run Again
          </button>

          <button
            className="btn btn-md btn-success"
            style={{ marginRight: '5px', marginTop: '3px' }}
          >
            <CheckCircleIcon /> Round Robin
          </button>
        </div>

        <hr />

        <div className="row">
          {/* Processos em Atendimento */}
          <div className="col-md-7">
            <div className="">
              <h4>Processo(s) em Atendimento:</h4>
              {this.state.attendance.map((v, k) => (
                <Attendance key={k} text={'P' + v.id} value={v.timeCost} />
              ))}
              <p id="numero_atendentes" className="form-text text-muted">
                {this.state.quantumTime} segundos para iniciar o próximo
                Atendimento.
              </p>
            </div>
          </div>

          {/* Configuracoes */}
          <div className="col-md-5">
            <div className="form-group">
              <input
                type="number"
                className="form-control"
                id="numero_atendentes"
                onChange={this._handlerInputOnChange}
                value={this.state.numberOfAttendances}
              />
              <small id="numero_atendentes" className="form-text text-muted">
                Define a Quantidade de Atendentes no sistema.
              </small>
            </div>

            <div className="form-group">
              <input
                type="number"
                className="form-control"
                id="time_max"
                onChange={this._handlerInputquantumMaxTimeOnChange}
                value={this.state.quantumMaxTime}
                min="1"
              />
              <small id="time_max" className="form-text text-muted">
                Define o Quantum de Atendimento em segundos.
              </small>
            </div>
          </div>
        </div>

        {/* Processos na fila de espera por Atendimento */}
        <div className="jumbotron">
          <h4>{this.state.queueProcessLog}</h4>
          {this.state.queueProcess.map((v, k) => (
            <Process
              key={k}
              top="0%"
              left={'0%'}
              text={'P' + v.id}
              value={v.timeCost}
            />
          ))}
          <h4 className="text-primary">{this.state.queueProcessLength}</h4>
        </div>

        <p className="float-md-right">Round Robin Simulation (RRS).</p>
      </div>
    );
  }
}
