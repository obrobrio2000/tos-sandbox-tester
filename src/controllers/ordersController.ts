import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/ordersService';
import * as tos from '../services/translationOsService';

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, sourceLang, targetLang } = req.body;
    if (!name || !sourceLang || !targetLang) {
      return res.status(400).json({ message: 'name, sourceLang and targetLang are required' });
    }

    const [srcOk, trgOk] = await Promise.all([
      tos.isLanguageSupported(sourceLang),
      tos.isLanguageSupported(targetLang),
    ]);
    if (!srcOk || !trgOk) {
      return res.status(400).json({
        message: `Unsupported language code(s): ${[
          !srcOk ? sourceLang : null,
          !trgOk ? targetLang : null,
        ]
          .filter(Boolean)
          .join(', ')}`,
      });
    }

    const order = await orderService.createOrder(name, sourceLang, targetLang);

    console.log(`Order created: ${order.id} (${order.sourceLang} -> ${order.targetLang})`);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

export async function addText(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = Number(req.params.orderId);
    const { content } = req.body;
    if (!content || content.length > 500) {
      return res.status(400).json({ message: 'content must be 1-500 chars' });
    }
    const text = await orderService.addText(orderId, content);

    console.log(`Text added to order ${orderId}: ${text.id} (${text.status})`);

    res.status(201).json(text);
  } catch (err) {
    next(err);
  }
}

export async function submitOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = Number(req.params.orderId);
    const { order, texts } = await orderService.getOrderWithTexts(orderId);
    if (order.submittedAt) {
      return res.status(400).json({ message: 'Order already submitted' });
    }
    if (!texts.length) {
      return res.status(400).json({ message: 'No texts to submit' });
    }

    // submit all texts and collect TOS request IDs
    const idRequests: number[] = [];
    await Promise.all(
      texts.map(async (text) => {
        const idRequest = await tos.submitTextForTranslation(
          text.id,
          text.content,
          order.sourceLang,
          order.targetLang,
        );
        idRequests.push(idRequest);
        await orderService.markTextSubmitted(text.id, idRequest);
      }),
    );

    await orderService.setOrderSubmitted(orderId);

    // for sandbox we can trigger delivery instead of waiting
    await tos.triggerSandboxDelivery(idRequests);

    console.log(`Order submitted with IDs: ${idRequests.join(', ')}`);

    res.status(200).json({ message: 'Order submitted' });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.getOrderWithTexts(orderId);

    console.log('Retrieved order data:', data);

    res.json(data);
  } catch (err) {
    next(err);
  }
}