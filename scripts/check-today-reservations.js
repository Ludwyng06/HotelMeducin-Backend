const mongoose = require('mongoose');
require('dotenv').config();

const ReservationSchema = new mongoose.Schema({
  checkInDate: Date,
  checkOutDate: Date,
  status: String,
  totalPrice: Number,
  userId: mongoose.Schema.Types.ObjectId,
  roomId: mongoose.Schema.Types.ObjectId
}, { collection: 'reservations' });

async function checkTodayReservations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-meducin');
    console.log('✅ Conectado a MongoDB');

    const Reservation = mongoose.model('Reservation', ReservationSchema);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`\n📅 Buscando reservaciones del día: ${today.toISOString()} a ${tomorrow.toISOString()}`);
    console.log(`📅 Fecha legible: ${today.toLocaleDateString('es-CO')}\n`);

    const reservations = await Reservation.find({
      checkInDate: { $gte: today, $lt: tomorrow }
    }).select('_id checkInDate checkOutDate status totalPrice userId roomId').lean();

    console.log(`📊 Total de reservaciones encontradas en MongoDB: ${reservations.length}\n`);

    if (reservations.length > 0) {
      console.log('📋 Detalles de las reservaciones:');
      reservations.forEach((res, index) => {
        console.log(`\n${index + 1}. Reservación ID: ${res._id}`);
        console.log(`   - Fecha Check-in: ${new Date(res.checkInDate).toLocaleString('es-CO')}`);
        console.log(`   - Fecha Check-out: ${new Date(res.checkOutDate).toLocaleString('es-CO')}`);
        console.log(`   - Estado: ${res.status}`);
        console.log(`   - Precio: $${res.totalPrice}`);
        console.log(`   - Usuario ID: ${res.userId}`);
        console.log(`   - Habitación ID: ${res.roomId}`);
      });

      const byStatus = {
        pending: reservations.filter(r => r.status === 'pending').length,
        confirmed: reservations.filter(r => r.status === 'confirmed').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length,
        completed: reservations.filter(r => r.status === 'completed').length,
      };

      console.log(`\n📊 Resumen por estado:`);
      console.log(`   - Pendientes: ${byStatus.pending}`);
      console.log(`   - Confirmadas: ${byStatus.confirmed}`);
      console.log(`   - Canceladas: ${byStatus.cancelled}`);
      console.log(`   - Completadas: ${byStatus.completed}`);
    } else {
      console.log('⚠️ No se encontraron reservaciones para el día de hoy');
    }

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTodayReservations();

