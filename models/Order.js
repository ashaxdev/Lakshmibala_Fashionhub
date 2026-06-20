import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    comboId: { type: mongoose.Schema.Types.ObjectId, ref: 'Combo', default: null },
    name: String,
    image: String,
    color: String,
    size: String,
    price: Number,
    qty: Number
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    customer: {
      name: String,
      phone: String,
      email: String
    },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
    },
    subtotal: Number,
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    shippingFee: { type: Number, default: 0 },
    total: Number,
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], default: 'razorpay' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'placed'
    },
    courier: {
      partner: { type: String, default: '' },
      trackingId: { type: String, default: '' },
      awbNumber: { type: String, default: '' }
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
