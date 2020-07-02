import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IProductInfo {
  product_id: string;
  quantity: number;
  price: number;
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository') private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  // TODO
  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const CustomerExists = await this.customersRepository.findById(customer_id);
    const updatedProducts: IProduct[] = [];
    const productsPrice: IProductInfo[] = [];

    if (!CustomerExists) {
      throw new AppError('Customer Does not exist');
    }
    const productsId = products.map(product => ({ id: product.id }));

    const productsById = await this.productsRepository.findAllById(productsId);

    products.forEach(product => {
      const productInfo = productsById.find(
        eachProduct => eachProduct.id === product.id,
      );

      if (!productInfo) {
        throw new AppError('Could not find the product');
      }

      if (product.quantity > productInfo.quantity) {
        throw new AppError('There is not enough of this product');
      }

      updatedProducts.push({
        quantity: productInfo.quantity - product.quantity,
        id: product.id,
      });

      productsPrice.push({
        product_id: product.id,
        quantity: product.quantity,
        price: productInfo.price,
      });
    });

    await this.productsRepository.updateQuantity(updatedProducts);

    const order = await this.ordersRepository.create({
      customer: CustomerExists,
      products: productsPrice,
    });

    return order;
  }
}

export default CreateOrderService;
