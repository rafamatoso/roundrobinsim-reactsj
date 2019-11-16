import React, { Component } from 'react';
import Process from './Process';
import Attendance from './Attendance';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import AutorenewIcon from '@material-ui/icons/Autorenew';

let count = 0;
let attendanceInterval = null;
let queueInterval = null;
let createProcessInterval = null;
const MAX_RANDOM = 5;

export default class RoundRobin extends Component {
  constructor(props) {
    super(props);
    this.state = this._initialState();
  }

  _initialState = () => {
    return {
      paused: true, // Estado geral do sistema: pausado ou não
      queueProcess: [], // Fila de processos em espera de atendimento
      attendance: [], // Lista de atendimento
      finalizedProcess: [], // Lista de processos finalizados
      numberOfAttendances: 4, // Número de atendentes (Cpu)
      quantumTime: 0, // variável para auxiliar no gerenciamento do quantum
      quantumMaxTime: 5, // tempo máximo do quantum de processamento
      queueProcessLog: '',
      queueProcessLength: '',
      btnText: 'Run'
    };
  };

  /* 1) Função que cria novos processos e gerencia a entrada na fila de Processos */
  _managerQueueProccess = () => {
    createProcessInterval = setInterval(() => {
      let { queueProcess, paused } = this.state;
      // Verifica o status do sistema
      if (!paused) {
        // Instancia novos processos
        let process = {
          id: null,
          quantumCost: null,
          timeInQueue: null
        };
        // Random Processos a adicionar na Fila de Processos
        let random = Math.floor(Math.random() * MAX_RANDOM) + 1;
        // Adiciona os novos Processos
        for (let i = 0; i < random; ++i) {
          process = new Object(); // A cada iteração, um novo objeto Process será instanciado
          count += 1; // Não pertence ao escopo da classe, será acessível por todos os objetos
          process.id = count; //
          process.quantumCost = Math.floor(Math.random() * MAX_RANDOM) + 1;
          process.timeInQueue = 0;
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

  /* 2) Função que "marca" o tempo na fila de espera de cada processo */
  _timeInQueueCounter = () => {
    let incTime = () => {
      let { paused, queueProcess } = this.state;
      if (!paused && queueProcess.length >= 1) {
        // Para cada objeto no array queueProcess será iterado um valor que representa o tempo do processo em espera na fila
        queueProcess.forEach(element => {
          element.timeInQueue += 1;
          //console.log(element.timeInQueue);
        });
      }
    };
    queueInterval = setInterval(incTime, 1000);
  };

  /* 3) Função que gerencia os processos que serão atendidos */
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

  /* 4) Função que gerencia o atendimento da CPU */
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
    let proccess = n === 1 ? 'Processo' : 'Processos';
    return (
      'Total de ' +
      this.state.queueProcess.length +
      ' ' +
      proccess +
      ' na Fila de Espera.'
    );
  };

  /* As funções handler servem para capturar algum tipo de informação executada pelo usuário
  exemplo: clique num botão, escrita num formulário e etc...*/
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

  /* componentDidMount() É invocado imediatamente após um componente ser montado (inserido na árvore). 
  Inicializações que exijam nós do DOM devem vir aqui. 
  Se precisar carregar data de um endpoint remoto, este é um bom lugar para instanciar sua requisição.*/
  componentDidMount() {
    this._managerQueueProccess();
    this._startAttendance();
    this._timeInQueueCounter();
  }

  /* componentWillUnmount() é invocado imediatamente antes que um componente seja desmontado e destruído.
  Qualquer limpeza necessária deve ser realizada neste método, como invalidar timers, cancelar requisições de rede, 
  ou limpar qualquer subscrição que foi criada no componentDidMount(). */
  componentWillUnmount() {
    clearInterval(attendanceInterval);
    clearInterval(createProcessInterval);
    clearInterval(queueInterval);
  }

  /* Método de renderização da aplicação */
  render() {
    return (
      <div className="container" style={{ marginTop: '10px' }}>
        <div className="d-inline-block" style={{ marginLeft: '0px' }}>
          <h3>UniFBV - RR Simulator</h3>
          <h4>
            Status:
            {this.state.paused ? (
              <span
                className="badge badge-warning"
                style={{ marginLeft: '10px' }}
              >
                Paused!
              </span>
            ) : (
              <span
                className="badge badge-success"
                style={{ marginLeft: '10px' }}
              >
                In Attendance...
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
        </div>

        <hr />

        <div className="row">
          {/* Processos em Atendimento */}
          <div className="col-md-7">
            <div className="">
              <h4>Processo(s) em Atendimento:</h4>
              {this.state.attendance.map((v, k) => (
                <Attendance key={k} text={'P' + v.id} value={v.quantumCost} />
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
                min="1"
                max="8"
              />
              <small id="numero_atendentes" className="form-text text-muted">
                Define a Quantidade de CPU's no sistema (min: 1, máx: 8).
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
              value={v.quantumCost}
            />
          ))}
          <h4 className="text-primary">{this.state.queueProcessLength}</h4>
        </div>

        <p className="float-md-right">Round Robin Simulator (RRS).</p>
      </div>
    );
  }
}
