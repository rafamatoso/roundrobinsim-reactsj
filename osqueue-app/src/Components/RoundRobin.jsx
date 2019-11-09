import React, { Component } from "react";
import Attendance from "./Attendance";
import Process from "./Process";

let count = 0;
let MAX_RANDOM = 1;
let intervalAttendance = null;
let queueInterval = null;

export default class RoundRobin extends Component {
  constructor(props) {
    super(props);
    this.state = this._initialState();
  }

  _initialState = () => {
    return {
      process: [], // processos
      queue: [], // fila
      attendance: [], // atendimento
      queueLog: "",
      queueLength: "",
      paused: true,
      numberAttendants: 1,
      quantumMax: 3,
      quantum: 0
      //btnStart: "Run"
    };
  };

  // Função responsável pela criação dos processos (clientes) e adição na fila
  _managerQueue = () => {
    queueInterval = setInterval(() => {
      let { queue, paused } = this.state;
      // Testa o sistema
      if (!paused) {
        // Quantidade de processos a serem adicionados na fila - Random
        let random = Math.floor(Math.random() * MAX_RANDOM) + 1;
        // Adiciona os novos processos na fila
        for (let i = 0; i < random; ++i) {
          count += 1;
          queue.push(count);
        }
        // Seta o estado
        this.setState({
          queue: queue,
          filaLog: this._getQueueLog(random),
          queueLength: this._getQueueLengthText()
        });
      }
    }, 5000);
  };

  // Função responsável por iniciar a Simulação de Atendimento da CPU
  _runAttendance = () => {
    let quantum = this.state.quantumMax;

    let incTime = () => {
      let { paused } = this.state; // Desestruturação: característica para se usar um Atributo específico do estado
      if (!paused) {
        if (quantum === 0) {
          this.managerAttendance();
          quantum = this.state.quantumMax;
        }
        this.setState({ quantum: quantum });
        quantum -= 1;
      }
    };
    intervalAttendance = setInterval(incTime, 1000);
  };

  _managerAttendance = () => {
    let { queue, attendance, paused, numberAttendants } = this.state;
    // Verifica se existe ao menos 1 processo para atendimento na fila
    if (!paused && queue.length >= 1) {
      let loops =
        queue.length < numberAttendants ? queue.length : numberAttendants;
      for (let i = 0; i < loops.length; ++i) {
        attendance.push(queue[i]);
      }
      /* 
        Nosso processo de gerenciamento de atendimento é diferente do exemplo do Professor
         devido a cada processo ter um valor próprio que será chamado de "PESO"
         para ser quantizado (processado). Se num atendimento o Peso > quantum, o processo 
         voltará para o final da fila para ser atendido novamente, se não, o 
         processo é finalizado e destruído
      */
    }
  };
}
