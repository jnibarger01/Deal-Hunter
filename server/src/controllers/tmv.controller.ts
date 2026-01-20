import { Request, Response, NextFunction } from 'express';
import tmvService from '../services/tmv.service';

export class TMVController {
  async compute(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = tmvService.computeDecisionPayload(req.body);
      res.status(200).json({
        success: true,
        data: payload,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TMVController();
