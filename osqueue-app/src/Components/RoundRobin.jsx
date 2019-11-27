import React, { Component } from 'react';
import Process from './Process';
import Attendance from './Attendance';
import Finalizeds from './Finalizeds';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import { ColorsApp } from '../Configurations/colors';
import Logo from '../Configurations/Assets/logorrs.png';

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
      finalizedProcess: [], // Lista de Processos Finalizados
      max_random: 5,
      numberOfAttendances: 4, // Número de Atendentes (Cpu)
      quantumMin: 0, // Quantum mínimo de atendimento
      quantumMax: 5, // Quantum máximo de atendimento
      systemTime: 0, // Tempo de Sistema
      listLambda: [], // Lista auxiliar
      listProcessInQueue: [], // Lista auxiliar
      listProcessInAttendance: [], // Lista auxiliar
      sumTimeQueue: 0, // Variável auxiliar
      sumQuantumCost: 0, // Variável auxiliar
      sumProcessInAttendance: 0, // Variável auxiliar
      lambda: 0, // Ritmo Médio de Chegada de Processos
      tq: 0, // Tempo Médio em Fila
      ta: 0, // Tempo médio de Atendimento
      ts: 0, // Tempo Médio no Sistema
      npq: 0, // Número Médio de Processos na Fila
      npa: 0, // Número Médio de Processos no Atendimento
      nps: 0, // Número Médio de Processos no Sistema
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
        // Instancia e adiciona os Processos na Fila de Espera
        for (let i = 0; i < random; ++i) {
          const process = {};
          count += 1;
          process.id = count;
          process.quantumCost = Math.floor(Math.random() * max_random) + 1;
          process.quantumCostAux = process.quantumCost;
          process.timeInQueue = 0;
          let randomPriority = Math.random();
          // Probabilidade de 15% para o Processo ser Prioritário
          randomPriority <= 0.15
            ? (process.priority = 1)
            : (process.priority = 0);
          process.starvation = false;
          // Adiciona o Processo instanciado na Fila de Espera
          queueProcess.push(process);
        }

        // Organiza Fila de Espera
        if (queueProcess.length >= 2) {
          queueProcess.sort(this._compareQuantumCost);
        }
        this.setState({
          queueProcess: queueProcess,
          queueProcessLog: this._getQueueProcessLogText(random),
          queueProcessLength: this._getQueueProcessLengthText(),
          lambda: this._calculateLambda()
        });
      }
    }, 5000);
  };

  /* 2) Contador de Tempo: 1) Tempo de Sistema e 2) Tempo de Processo na Fila de Espera */
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
          this._isInStarvation(element);
        });
      }
    };
    queueInterval = setInterval(incTime, 1000);
  };

  // 3) Função que gerencia os processos que serão atendidos
  _managerAttendance = () => {
    let { queueProcess, paused, numberOfAttendances } = this.state;
    // Bloco que verifica a lista de Espera de Processos para adicioná-los no Atendimento
    if (!paused && queueProcess.length >= 1) {
      let loops =
        queueProcess.length < numberOfAttendances
          ? queueProcess.length
          : numberOfAttendances;
      // Lista de Processos em Atendimento
      let attendance = [];

      /* Verifica se existe 1 processo prioritário na Fila de Espera
      A variável processPriorityIndex será atribuída com o resultado do id do primeiro elemento
      que possui prioridade = 1, servindo de pivô a ser remanajedado entre as outras listas */
      let processPriorityIndex = queueProcess.indexOf(
        queueProcess.find(element => {
          return element.priority === 1;
        })
      );

      // Variável criada para auxiliar na lógica de remoção e adição nas listas.
      let countProcessPriorityIndex = 0;

      // Bloco que gerencia a inclusão do Processo Prioritário no Atendimento e sua retirada da Fila de Espera
      if (processPriorityIndex >= 0) {
        attendance.push(queueProcess[processPriorityIndex]);
        queueProcess.splice(processPriorityIndex, 1);
        countProcessPriorityIndex++;
      }

      // Se houver processo prioritário, os outros processos perderão prioridade na hora da adição ao Atendimento
      for (let i = 0; i < loops - countProcessPriorityIndex; ++i) {
        attendance.push(queueProcess[i]);
      }
      // Remove os Processos da Fila de Processos para o Atendimento
      queueProcess.splice(0, numberOfAttendances);

      this.setState({
        queueProcess: queueProcess,
        attendance: attendance,
        queueProcessLength: this._getQueueProcessLengthText()
      });
    }
  };

  // 4) Função que gerencia o atendimento da CPU
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
          // Percorre a lista de Processos Atendidos
          attendance.forEach(element => {
            element.quantumCostAux -= 1;
            if (element.quantumCostAux <= 0) {
              element.quantumCostAux = 0;
              // Os Processos que terminaram são adicionados a lista de Finalizados
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
        // Diminui o Quantum de cada Processo em Atendimento
        quantumMin -= 1;
      }
    };
    attendanceInterval = setInterval(incTime, 1000);
  };

  // Função que compara os elementos e auxilia o método .sort
  _compareQuantumCost(a, b) {
    return (
      (a.quantumCostAux < b.quantumCostAux
        ? -1
        : a.quantumCostAux > b.quantumCostAux
        ? 1
        : 0) * -1
    );
  }

  // 1) Calcula a Taxa de Chegada de Processos no Sistema
  _calculateLambda() {
    let { listLambda } = this.state;
    let sumLambda = 0;
    listLambda.forEach(element => {
      sumLambda += element;
    });
    return (sumLambda / listLambda.length).toFixed(2);
  }

  // 2) Tempo Médio de Atendimento
  // 3) Tempo Médio de Espera na Fila
  // 4) Tempo Médio de Permanência no Sistema - TS
  _calculateTS(element) {
    let { sumQuantumCost, sumTimeQueue, finalizedProcess } = this.state;

    // 2) Tempo Médio de Atendimento
    sumQuantumCost += element.quantumCost;
    let ta = +(sumQuantumCost / finalizedProcess.length).toFixed(2);

    // 3) Tempo Médio de Espera na Fila
    sumTimeQueue += element.timeInQueue;

    let tq = +(sumTimeQueue / finalizedProcess.length).toFixed(2);

    // 4) - Tempo Médio de Permanência no Sistema - TS
    let ts = tq + ta;

    this.setState({
      sumTimeQueue: sumTimeQueue,
      sumQuantumCost: sumQuantumCost,
      ta: ta,
      tq: tq,
      ts: ts
    });
  }

  // 5) - Média de Clientes na Fila
  _calculateNPQ() {
    let { listProcessInQueue, queueProcess } = this.state;
    listProcessInQueue.push(queueProcess.length);
    let sumProcessInQueue = 0;
    listProcessInQueue.forEach(element => {
      sumProcessInQueue += element;
    });
    let npq = sumProcessInQueue / listProcessInQueue.length;
    this.setState({
      npq: npq,
      listProcessInQueue: listProcessInQueue
    });
  }

  // 6) Média de Clientes no Sistema
  _calculateNPS() {
    let { attendance, listProcessInAttendance, npq } = this.state;

    let sumProcessInAttendance = 0;
    let npa = 0;
    listProcessInAttendance.push(attendance.length);
    listProcessInAttendance.forEach(element => {
      sumProcessInAttendance += element;
    });
    npa = sumProcessInAttendance / listProcessInAttendance.length;
    // 6) Média de Clientes no Sistema
    let nps = npq + npa;
    this.setState({
      nps: nps,
      npa: npa
    });
  }

  _isInStarvation(element) {
    let { ts, systemTime } = this.state;
    /* Variável auxiliar que define que o Processo entrará em starvation se possuir tempo de fila 50% maior que 
    que o TS - Tempo Médio de Permanência no Sistema. */
    let starving = ts * 1.5;
    // Só será executada a partir de 25 segundos de iniciação do Sistema (tempo hábil para se ter um TS razoável)
    if (
      !element.starvation &&
      systemTime >= 25 &&
      element.timeInQueue >= starving
    ) {
      element.starvation = true;
      element.priority = 1;
    }
  }

  // Funções auxiliares que mostram textos na aplicação
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

  // Funções do tipo handler capturam algum tipo de informação do usuário
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

  // Componentes montados, executa o escopo
  componentDidMount() {
    this._managerQueueProccess();
    this._startAttendance();
    this._timeCounter();
  }

  // Componentes serão desmontados, limpa a app
  componentWillUnmount() {
    clearInterval(attendanceInterval);
    clearInterval(createProcessInterval);
    clearInterval(queueInterval);
  }

  render() {
    return (
      <div
        style={{ marginTop: '10px', marginRight: '50px', marginLeft: '50px' }}
      >
        <div className="row" style={{ alignItems: 'center' }}>
          <img
            src={Logo}
            alt=""
            style={{ height: '80px', width: '80px' }}
          ></img>
          <h3>UniFBV - Round Robin Simulator</h3>
        </div>
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
              text={v.priority === 0 ? 'P' + v.id : '!P' + v.id}
              value={v.quantumCostAux}
              priority={v.priority}
              starvation={v.starvation}
            />
          ))}
          <h4 className="text-primary">{this.state.queueProcessLength}</h4>
        </div>

        <hr />

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
                  text={v.priority === 0 ? 'P' + v.id : '!P' + v.id}
                  value={v.quantumCostAux}
                  priority={v.priority}
                  starvation={v.starvation}
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
                backgroundColor: ColorsApp.bg2Attendance,
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
                  {'1) Ritmo Médio de Chegada (Lambda): '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {(this.state.lambda / 5).toFixed(2) + ' processos/seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'2) Tempo Médio de Atendimento: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.ta.toFixed(2) + ' seg'}
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
                  {'4) Tempo Médio de Permanência no Sistema: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.ts.toFixed(2) + ' seg'}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'5) Média de Processos na Fila: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.npq.toFixed(0)}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'6) Média de Clientes no Sistema: '}
                  {
                    <text style={{ fontWeight: 'bold' }}>
                      {this.state.nps.toFixed(0)}
                    </text>
                  }
                </h7>
                <div></div>
                <h7>
                  {'7) Quantidade de Processos Criados: '}
                  {<text style={{ fontWeight: 'bold' }}>{count}</text>}
                </h7>
              </div>
            </div>
          </div>
        </div>

        <hr />

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
            <Finalizeds
              key={k}
              top="0%"
              left={'0%'}
              text={v.priority === 0 ? 'P' + v.id : '!P' + v.id}
              priority={v.priority}
              starvation={v.starvation}
            />
          ))}
          {this.state.finalizedProcess.length >= 1 ? (
            <h4 className="text-primary">{this.state.queueFinalizedLog}</h4>
          ) : (
            <h4>{''}</h4>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <h6>Round Robin Simulator (RRS).</h6>
        </div>
      </div>
    );
  }
}
