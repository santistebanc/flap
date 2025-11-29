/**
 * DELETE /api/admin/clear - Clear all data endpoint
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { clearAllData } from '../../../utils/redis';

export async function deleteAdminClear(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await clearAllData();
    console.log(`Cleared ${result.deleted} keys from Redis`);
    return reply.send({
      success: true,
      deleted: result.deleted,
      message: `Successfully cleared ${result.deleted} keys`,
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return reply.code(500).send({ 
      success: false,
      error: 'Failed to clear data' 
    });
  }
}

