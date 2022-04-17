import mongoose from 'mongoose';
const CountrySchema = new mongoose.Schema({
	country: {
		type: String,
		required: true,
		unique: true
	},
	tree: {
		type: Object,
		required: true
	}
});

export default mongoose.model('Country', CountrySchema);
