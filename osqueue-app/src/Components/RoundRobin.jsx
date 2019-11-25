import React, { Component } from 'react';
import Process from './Process';
import Attendance from './Attendance';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import { ColorsApp } from '../Configurations/colors';

let count = 0;
let attendanceInterval = null;
let queueInterval = null;
let createProcessInterval = null;

export default class RoundRobin extends Component {
  constructor(props) {
    super(props);
    this.state = this._initialState();
  }

  _initialState = () => {
    return {
      paused: true, // Estado geral do sistema: pausado ou não.

      queueProcess: [], // Fila de Processos em espera por Atendimento
      attendance: [], // Lista de Processos em Atendimento
      finalizedProcess: [], // Lista de Processos finalizados

      max_random: 5,

      numberOfAttendances: 4, // Número de Atendentes (Cpu)
      quantumMin: 0, // Variável para auxiliar no gerenciamento do quantum
      quantumMax: 5, // Quantum máximo de atendimento
      systemTime: 0, // Tempo de Sistema

      listLambda: [], // Lista auxiliar para cálculo do Lambda
      lambda: 0, // Métrica 1 - Ritmo Médio de Chegada de Processos

      sumTimeQueue: 0,
      tq: 0, // Tempo médio em Fila

      sumQuantumCost: 0,
      averageQuantumCost: 0, // Tempo médio de Atendimento

      ts: 0,

      listProcessInQueue: [],
      npq: 0, // Número de Processos no Sistema

      nps: 0,

      listProcessInAttendance: [],
      sumProcessInAttendance: 0,
      ta: 0,

      queueProcessLog: '',
      queueProcessLength: '',
      queueFinalizedLog: '',
      btnText: 'Run'
    };
  };

  // 1) Função que cria novos processos e gerencia a entrada na fila de Processos
  _managerQueueProccess = () => {
    createProcessInterval = setInterval(() => {
      let { queueProcess, paused, listLambda, max_random } = this.state;

      if (!paused) {
        let random = Math.floor(Math.random() * max_random) + 1;

        // Lista auxiliar utilizada para o calculo da Taxa de Chegada no Sistema
        listLambda.push(random);

        // Instancia e adiciona os objetos Processos na Fila de Espera
        for (let i = 0; i < random; ++i) {
          const process = {};
          count += 1;
          process.id = count;
          process.quantumCost = Math.floor(Math.random() * max_random) + 1;
          process.quantumCostAux = process.quantumCost;
          process.timeInQueue = 0;

          // Adiciona o Processo instanciado na Fila de Espera
          queueProcess.push(process);

          // Se a fila tiver 2 ou mais processos, ela é organizada em ordem decrescente do custo de Quantum auxiliar
          if (queueProcess.length >= 2) {
            queueProcess.sort(this._compare);
          }
        }

        this.setState({
          queueProcess: queueProcess,
          queueProcessLog: this._getQueueProcessLogText(random),
          queueProcessLength: this._getQueueProcessLengthText(),
          lambda: this._calculateLambda(listLambda)
        });
      }
    }, 5000);
  };

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

        // Chama função para o calculo da Média de Processos na Fila de Espera - NPQ
        this._calculateNPQ();

        // Chama funcão para o calculo da Média de Processos no Sistema - NPS
        this._calculateNPS();

        this.setState({
          systemTime: systemTime
        });
      }
      if (!paused && queueProcess.length >= 1) {
        /* Bloco que será responsável por marcar o tempo em Fila de Espera de cada Processo */
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

    /* Bloco que verifica a lista de Espera de Processos para adicioná-los no Atendimento */
    if (!paused && queueProcess.length >= 1) {
      let loops =
        queueProcess.length < numberOfAttendances
          ? queueProcess.length
          : numberOfAttendances;

      /* Adiciona Processos ao Atendimento de acordo com a qtd de Atendentes*/
      let attendance = [];
      for (let i = 0; i < loops; ++i) {
        attendance.push(queueProcess[i]);
      }

      /* Remove os Processos que foram para Atendimento da Fila de Processos */
      queueProcess.splice(0, numberOfAttendances);

      this.setState({
        queueProcess: queueProcess,
        attendance: attendance,
        queueProcessLength: this._getQueueProcessLengthText()
      });
    }
  };

  /* 4) Função que gerencia o atendimento da CPU */
  _startAttendance = () => {
    let quantumMin = this.state.quantumMax;
    let incTime = () => {
      let {
        paused,
        queueProcess,
        attendance,
        finalizedProcess,
        numberOfAttendances
      } = this.state;

      if (!paused) {
        if (quantumMin === 0) {
          this._managerAttendance();
          quantumMin = this.state.quantumMax;
          attendance.forEach(element => {
            element.quantumCostAux -= 1;
            if (element.quantumCostAux <= 0) {
              element.quantumCostAux = 0;
              // Adiciona os Processos que terminaram são adicionados à lista de Finalizados
              finalizedProcess.push(element);
              // Chama a função para o Cálculo do Tempo Médio de Permanência no Sistema
              this._calculateTS(element);
            } else {
              queueProcess.push(element);
            }
            this.setState({
              queueProcessLength: this._getQueueProcessLengthText(),
              queueFinalizedLog: this._getQueueFinalizedLength()
            });
          });
          // Limpa o array de Atendimento quando o Tempo de Quantum da CPU se esgota
          attendance.splice(0, numberOfAttendances);
        }
        // Bloco responsável pela diminuição do Custo de Quantum de cada processo em Atendimento
        if (attendance.length >= 1) {
          attendance.forEach(element => {
            if (element.quantumCostAux > 0) {
              element.quantumCostAux -= 1;
            }
          });
        }
        this.setState({ quantumMin: quantumMin }, () => {});
        quantumMin -= 1;
      }
    };
    attendanceInterval = setInterval(incTime, 1000);
  };

  // Calcula a Taxa de Chegada de Processos no Sistema
  _calculateLambda(list) {
    let sumLambda = 0;
    list.forEach(element => {
      sumLambda += element;
    });
    return (sumLambda / list.length).toFixed(2);
  }

  // Métrica 1 - Tempo Médio de Permanência no Sistema - TS
  _calculateTS(element) {
    let { sumQuantumCost, sumTimeQueue, finalizedProcess } = this.state;

    sumQuantumCost += element.quantumCost;
    let averageQuantumCost = +(
      sumQuantumCost / finalizedProcess.length
    ).toFixed(2);

    sumTimeQueue += element.timeInQueue;
    let tq = +(sumTimeQueue / finalizedProcess.length).toFixed(2);

    let ts = tq + averageQuantumCost;

    this.setState({
      sumQuantumCost: sumQuantumCost,
      averageQuantumCost: averageQuantumCost,
      sumTimeQueue: sumTimeQueue,
      tq: tq,
      ts: ts
    });
  }

  // Métrica 4 - Média de Clientes no Sistema
  _calculateNPS() {
    let { attendance, listProcessInAttendance, npq } = this.state;
    let sumProcessInAttendance = 0;
    let ta = 0;
    listProcessInAttendance.push(attendance.length);
    listProcessInAttendance.forEach(element => {
      sumProcessInAttendance += element;
    });
    // Tempo Médio dos Processos em Atendimento
    ta = sumProcessInAttendance / listProcessInAttendance.length;
    // Calcula a média de Elementos no Sistema
    let nps = npq + ta;
    this.setState({
      nps: nps,
      ta: ta
    });
  }

  // Métrica 5 - Média de Clientes na Fila de Espera
  _calculateNPQ() {
    let { listProcessInQueue, queueProcess } = this.state;
    listProcessInQueue.push(queueProcess.length);
    let sumProcessInpqueue = 0;
    listProcessInQueue.forEach(element => {
      sumProcessInpqueue += element;
    });
    let npq = sumProcessInpqueue / listProcessInQueue.length;
    this.setState({
      npq: npq,
      listProcessInQueue: listProcessInQueue
    });
  }

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
    });
  };

  _handlerRandomOnChange = e => {
    if (e.target.value <= 1) {
      this.setState({ max_random: 1 });
    } else if (e.target.value > 10) {
      this.setState({ max_random: 10 });
    } else {
      this.setState({ max_random: e.target.value });
    }
  };

  _handlerInputOnChange = e => {
    if (e.target.value <= 1) {
      this.setState({ numberOfAttendances: 1 });
    } else if (e.target.value > 8) {
      this.setState({ numberOfAttendances: 8 });
    } else {
      this.setState({ numberOfAttendances: e.target.value });
    }
  };

  _handlerInputquantumMaxOnChange = e => {
    if (e.target.value <= 1) {
      this.setState({ quantumMax: 1 });
    } else {
      this.setState({ quantumMax: e.target.value });
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
      <div
        style={{ marginTop: '10px', marginRight: '50px', marginLeft: '50px' }}
      >
        <h3>UniFBV - Round Robin Simulator</h3>
        <hr></hr>
        <div className="row">
          <div
            className="col-md-4"
            style={{
              paddingTop: '3px',
              marginBottom: '10px'
            }}
          >
            <h4>
              Status do Sistema:
              {this.state.paused ? (
                <span
                  className="badge badge-danger"
                  style={{ marginLeft: '10px' }}
                >
                  Pausado
                </span>
              ) : (
                <span
                  className="badge badge-success"
                  style={{ marginLeft: '10px' }}
                >
                  Ativo
                </span>
              )}
            </h4>
            <h5>Tempo de Sistema: {this.state.systemTime} seg</h5>
          </div>

          {/* Entradas do Usuário */}

          <div
            className="col-md-6"
            style={{
              paddingTop: '3px'
            }}
          >
            <div className="form-row" style={{ marginLeft: '0px' }}>
              <div
                className="form-group"
                style={{
                  width: '170px',
                  marginRight: '10px'
                }}
              >
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
                  Quantidade de Atendentes (Min: 1, Máx: 8).
                </small>
              </div>

              <div
                className="form-group"
                style={{ width: '170px', marginRight: '10px' }}
              >
                <input
                  type="number"
                  className="form-control"
                  id="time_max"
                  onChange={this._handlerInputquantumMaxOnChange}
                  value={this.state.quantumMax}
                  min="1"
                />
                <small id="time_max" className="form-text text-muted">
                  Quantum de Atendimento (Min: 1)
                </small>
              </div>

              <div
                className="form-group"
                style={{ width: '170px', marginRight: '10px' }}
              >
                <input
                  type="number"
                  className="form-control"
                  id="random_max"
                  onChange={this._handlerRandomOnChange}
                  value={this.state.max_random}
                  min="1"
                  max="10"
                />
                <small id="random_max" className="form-text text-muted">
                  Valor Máximo para Random (Min: 1, Máx: 10)
                </small>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="col-md-2">
            <div>
              <button
                className=" btn-md btn-primary btn-block"
                onClick={this._handlerBtnOnClick}
                style={{
                  marginTop: '3px',
                  paddingBottom: '6px'
                }}
              >
                {this.state.paused ? <PlayArrowIcon /> : <PauseIcon />}
                {this.state.btnText}
              </button>
            </div>
            <div>
              <button
                className=" btn-md btn-danger btn-block"
                onClick={this._handlerRestartOnClick}
                style={{ marginTop: '6px', paddingBottom: '6px' }}
              >
                <AutorenewIcon /> Refresh
              </button>
            </div>
          </div>
        </div>

        <hr />

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

        <hr></hr>

        <div className="row">
          {/* Processos em Atendimento */}
          <div className="col-md-6">
            <div
              style={{
                backgroundColor: ColorsApp.bg1,
                borderRadius: '10px',
                paddingTop: '20px',
                paddingBottom: '16px',
                paddingLeft: '32px',
                paddingRight: '32px',
                marginBottom: '10px'
              }}
            >
              <h5>Processo(s) em Atendimento:</h5>
              {this.state.attendance.map((v, k) => (
                <Attendance
                  key={k}
                  text={'P' + v.id}
                  value={v.quantumCostAux}
                />
              ))}
              <p id="numero_atendentes" className="form-text text-muted">
                {this.state.quantumMin} segundos para iniciar o próximo
                Atendimento.
              </p>
            </div>
          </div>

          {/* Métricas */}
          <div className="col-md-6">
            <div
              style={{
                backgroundColor: ColorsApp.bg1,
                borderRadius: '10px',
                paddingTop: '20px',
                paddingBottom: '16px',
                paddingLeft: '32px',
                paddingRight: '32px',
                height: 'auto'
              }}
            >
              <h5>Métricas:</h5>
              <div style={{ display: 'block' }}>
                <h7>
                  {'1) Lambda - Ritmo Médio de Chegada: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {(this.state.lambda / this.state.quantumMax).toFixed(2) +
                        ' seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'2) Tempo Médio de Permanência no Sistema: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.ts.toFixed(2) + ' seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'3) Tempo Médio de Espera na Fila: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.tq.toFixed(2) + ' seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'4) Tempo Médio de Atendimento (Quantum): '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.averageQuantumCost.toFixed(2) + ' seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'5) Média de Clientes no Sistema: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.nps.toFixed(0)}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'6) Média de Processos na Fila: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.npq.toFixed(0)}
                    </text>
                  }
                </h7>
              </div>
            </div>
          </div>
        </div>

        <hr></hr>

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
            <h4>{''}</h4>
          )}
        </div>

        <h6 className="float-md-right">Round Robin Simulator (RRS).</h6>
      </div>
    );
  }
}
