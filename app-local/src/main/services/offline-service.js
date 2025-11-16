// main/services/offline-service.js
const {
  insertLocalUser,
  insertLocalSubscription,
  insertLocalCheckin,
  getLocalData,
} = require("../db/db");
const { safeStringify } = require("../../../utils/safe-json");

/**
 * Serviço OFFLINE — operações locais sem API
 */
module.exports = {
  /**
   * Registrar usuário offline
   */
  async cadastrarUsuarioLocal(usuario) {
    const result = await insertLocalUser(usuario);
    return {
      success: true,
      id: result.lastID,
    };
  },

  /**
   * Registrar inscrição offline
   */
  async inscreverLocal(inscricao) {
    const result = await insertLocalSubscription(inscricao);
    return {
      success: true,
      id: result.lastID,
    };
  },

  /**
   * Registrar presença offline
   */
  async registrarPresencaLocal(inscricaoIdLocal) {
    const result = await insertLocalCheckin(inscricaoIdLocal);
    return {
      success: true,
      id: result.lastID,
    };
  },

  /**
   * Consultar dados locais para exibir no front
   */
  async buscarDadosLocais() {
    const data = await getLocalData();
    return {
      success: true,
      data,
    };
  },
};