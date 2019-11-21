import React, { Component } from 'react';
import Process from './Process';
import Attendance from './Attendance';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';

let count = 0;
let attendanceInterval = null;
let queueInterval = null;
let createProcessInterval = null;
const MAX_RANDOM = 8;

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
      quantumTime: 0, // Variável para auxiliar no gerenciamento do quantum
      quantumMaxTime: 5, // Tempo máximo do quantum de processamento
      systemTime: 0, // Tempo de Sistema
      averageTimeQueue: 0,
      sumQuantumCost: 0,
      averageQuantumCost: 0,
      queueProcessLog: '',
      queueProcessLength: '',
      queueFinalizedLog: '',
      btnText: 'Run'
    };
  };

  /* 1) Função que cria novos processos e gerencia a entrada na fila de Processos */
  _managerQueueProccess = () => {
    createProcessInterval = setInterval(() => {
      let { queueProcess, paused } = this.state;
      // Verifica o status do sistema
      if (!paused) {
        // Random Processos a adicionar na Fila de Processos
        let random = Math.floor(Math.random() * MAX_RANDOM) + 1;
        // Adiciona os novos Processos
        for (let i = 0; i < random; ++i) {
          const process = {}; // A cada iteração, um novo objeto Process será instanciado
          count += 1; // Não pertence ao escopo da classe, será acessível por todos os objetos
          process.id = count; //
          process.quantumCost = Math.floor(Math.random() * MAX_RANDOM) + 1;
          process.quantumCostAux = process.quantumCost;
          process.timeInQueue = 0;
          queueProcess.push(process);
          /* Após os processos serem adicionados na fila de espera, a fila é organizada em ordem decrescente
            do custo de cada processo */
          if (queueProcess.length >= 2) {
            queueProcess.sort(this._compare);
          }
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

  /* 1.1) Método criado para auxiliar na organização da fila (comparador). O custo de quantum é o atributo a ser comparado. */
  _compare(a, b) {
    return (
      (a.quantumCostAux < b.quantumCostAux
        ? -1
        : a.quantumCostAux > b.quantumCostAux
        ? 1
        : 0) * -1
    );
  }

  /* 2) Função que "marca" os tempos: 1) Sistema, 2) Tempo de cada processo na fila de espera */
  _timeCounter = () => {
    let incTime = () => {
      let { paused, queueProcess, systemTime } = this.state;
      if (!paused) {
        systemTime += 1;
        this.setState({ systemTime: systemTime });
      }
      if (!paused && queueProcess.length >= 1) {
        // Para cada objeto no array queueProcess será iterado um valor que representa o tempo do processo sempre que estiver na fila de espera
        queueProcess.forEach(element => {
          element.timeInQueue += 1;
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
    // Criada uma variável chamada quantumTime que auxiliará na contagem do quantum da CPU
    let quantumTime = this.state.quantumMaxTime;
    // Função criada para iterar o quantum de cada processo. Seu escopo será executado se o sistema estiver ativo
    let incTime = () => {
      let {
        paused,
        queueProcess,
        attendance,
        finalizedProcess,
        numberOfAttendances,
        sumQuantumCost,
        averageQuantumCost
      } = this.state;
      if (!paused) {
        /* Último "estado" do sistema de atendimento. A variável quantumTime começará com 0, e quando o atendimento é realizado, 
        receberá o valor de quantumMaxTime, sendo iterada até chegar a 0 novamente */
        if (quantumTime === 0) {
          this._managerAttendance();
          quantumTime = this.state.quantumMaxTime;
          /* Bloco que gerencia a devolução do processo para a fila de espera ou inclusão na lista de finalizados */
          attendance.forEach(element => {
            element.quantumCostAux -= 1;
            if (element.quantumCostAux <= 0) {
              element.quantumCostAux = 0;
              finalizedProcess.push(element);
              sumQuantumCost += element.quantumCost;
              averageQuantumCost = sumQuantumCost / finalizedProcess.length;
            } else {
              queueProcess.push(element);
            }
            this.setState({
              queueProcessLength: this._getQueueProcessLengthText(),
              queueFinalizedLog: this._getQueueFinalizedLength(),
              sumQuantumCost: sumQuantumCost,
              averageQuantumCost: averageQuantumCost
            });
          });
          /* Limpa o array de Atendimento da CPU */
          attendance.splice(0, numberOfAttendances);
        }
        /* Bloco responsável pela diminuição do custo de quantum (em segundos) de cada processo em atendimento */
        if (attendance.length >= 1) {
          attendance.forEach(element => {
            if (element.quantumCostAux > 0) {
              element.quantumCostAux -= 1;
            }
          });
        }
        this.setState({ quantumTime: quantumTime }, () => {});
        quantumTime -= 1;
      }
    };
    /* Temporizador do Atendimento: 1 segundo */
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

  _getQueueFinalizedLength = n => {
    let proccess = n === 1 ? 'Processo' : 'Processos';
    let length =
      this.state.finalizedProcess.length === 1 ? 'Finalizado' : 'Finalizados';
    return (
      'Total de ' +
      this.state.finalizedProcess.length +
      ' ' +
      proccess +
      ' ' +
      length
    );
  };

  /* As funções handler servem para capturar algum tipo de informação de input pelo usuário
  exemplo: click de um botão, escrita num formulário e etc...*/
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
    this._timeCounter();
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
      <div className="row">
        <div
          className="container"
          style={{ marginTop: '10px', width: '800px' }}
        >
          <div className="d-inline-block" style={{ marginLeft: '0px' }}>
            <h3>UniFBV - Round Robin Simulator</h3>
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
            <h5>Tempo de Sistema: {this.state.systemTime} seg</h5>
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
              <AutorenewIcon /> Refresh System
            </button>
          </div>

          <hr />

          <div className="row">
            {/* Processos em Atendimento */}
            <div className="col-md-7">
              <div className="">
                <h4>Processo(s) em Atendimento:</h4>
                {this.state.attendance.map((v, k) => (
                  <Attendance
                    key={k}
                    text={'P' + v.id}
                    value={v.quantumCostAux}
                  />
                ))}
                <p id="numero_atendentes" className="form-text text-muted">
                  {this.state.quantumTime} segundos para iniciar o próximo
                  Atendimento.
                </p>
              </div>
            </div>

            {/* Entradas do Usuário */}
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
                  Define a Quantidade de CPU's no sistema (Min: 1, Máx: 8).
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

          <hr></hr>

          {/* Processos na fila de espera por Atendimento */}
          <div
            className="jumbotron"
            style={{ paddingTop: '20px', paddingBottom: '16px' }}
          >
            <h5>{this.state.queueProcessLog}</h5>
            {this.state.queueProcess.map((v, k) => (
              <Process
                key={k}
                top="0%"
                left={'0%'}
                text={'P' + v.id}
                value={v.quantumCostAux}
              />
            ))}
            <h4 className="text-primary">{this.state.queueProcessLength}</h4>
          </div>

          {/* Processos Finalizados */}
          <div
            className="jumbotron"
            style={{ paddingTop: '20px', paddingBottom: '16px' }}
          >
            {this.state.finalizedProcess.length >= 1 ? (
              <h5>Finalizados:</h5>
            ) : (
              <></>
            )}
            {this.state.finalizedProcess.map((v, k) => (
              <div
                className="d-inline-block"
                style={{ marginLeft: '5px', marginBottom: '5px' }}
                key={k}
              >
                <Badge color="secondary" badgeContent={v.quantumCostAux}>
                  <Button
                    size="small"
                    variant="contained"
                    style={{ margin: '10px', padding: '0px' }}
                  >
                    {'P' + v.id}
                  </Button>
                </Badge>
              </div>
            ))}
            {this.state.finalizedProcess.length >= 1 ? (
              <h4 className="text-primary">{this.state.queueFinalizedLog}</h4>
            ) : (
              <h4 />
            )}
          </div>

          {/* Renderização das Métricas */}

          <h5 className="float-md-right">Round Robin Simulator (RRS).</h5>
        </div>
        <div
          style={{
            width: '700px'
          }}
        >
          <div className="container" style={{ marginTop: '10px' }}>
            <div className="float-md-left">
              <div className="d-inline-block" style={{ marginLeft: '0px' }}>
                <h6>
                  {'1) Tempo Médio de Permanência no Sistema: '}
                  {this.state.averageQuantumCost} seg
                </h6>
                <h6>{'2) Tempo Médio de Espera na Fila: '}</h6>
                <h6>{'3) Tempo Médio de Atendimento: '}</h6>
                <h6>{'4) Média de Clientes no Sistema: '}</h6>
                <h6>{'5) Média de Clientes na Fila: '}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
