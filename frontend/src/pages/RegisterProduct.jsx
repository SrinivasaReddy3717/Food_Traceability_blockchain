import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API_BASE_URL,
  getAuthHeaders,
  getStoredAuth,
} from '../utils/api';
import './RegisterProduct.css';

function RegisterProduct() {
  const navigate = useNavigate();
  const { user } = getStoredAuth();
  const canRegister =
    user && ['Admin', 'Farmer', 'Producer'].includes(user.role);

  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    producerName: user?.organization || user?.name || '',
    origin: '',
    productionDate: '',
    batchNumber: '',
    quantity: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/products/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          productName: formData.productName.trim(),
          category: formData.category,
          producer: formData.producerName.trim(),
          origin: formData.origin.trim(),
          productionDate: formData.productionDate,
          quantity: Number(formData.quantity),
          batchNumber: formData.batchNumber.trim(),
          description: formData.description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Product registration failed.'
        );
      }

      const productId = result.product.productId;

      alert(
        `Product registered successfully!\n\nProduct ID: ${productId}`
      );

      setFormData({
        productName: '',
        category: '',
        producerName: '',
        origin: '',
        productionDate: '',
        batchNumber: '',
        quantity: '',
        description: '',
      });

      navigate('/products');
    } catch (error) {
      console.error('Product registration error:', error);
      setErrorMessage(
        error.message || 'Unable to connect to the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-product-page">
      {/* Header */}
      <div className="register-product-header">
        <div>
          <p className="register-eyebrow">PRODUCT MANAGEMENT</p>

          <h1>Register New Product</h1>

          <p>
            Add a food product and begin its journey through the supply chain.
          </p>
        </div>

        <Link to="/dashboard" className="register-back-button">
          ← Dashboard
        </Link>
      </div>

      {/* Registration Card */}
      <div className="registration-card">
        <div className="registration-card-header">
          <h2>Product Information</h2>

          <p>
            Signed in as: <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        {!canRegister && (
          <div
            role="alert"
            style={{
              padding: '12px',
              marginBottom: '18px',
              color: '#9a6a00',
              background: '#fff8df',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            Role <strong>{user?.role}</strong> cannot register new products.
            Please sign in as <strong>Farmer</strong>, <strong>Producer</strong>,
            or <strong>Admin</strong>.{' '}
            <Link to="/login" style={{ color: '#376f45', fontWeight: 700 }}>
              Switch Account
            </Link>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '12px',
              marginBottom: '18px',
              color: '#b42318',
              background: '#fef3f2',
              borderRadius: '8px',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form
          className="registration-form"
          onSubmit={handleSubmit}
        >
          <div className="form-row">
            <div className="registration-form-group">
              <label htmlFor="productName">Product Name</label>

              <input
                type="text"
                id="productName"
                name="productName"
                placeholder="Enter product name"
                value={formData.productName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="registration-form-group">
              <label htmlFor="category">Category</label>

              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select category
                </option>

                <option value="Grains">Grains</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Processed Food">Processed Food</option>
                <option value="Dairy">Dairy</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="registration-form-group">
              <label htmlFor="producerName">Producer / Farm Name</label>

              <input
                type="text"
                id="producerName"
                name="producerName"
                placeholder="Enter producer or farm name"
                value={formData.producerName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="registration-form-group">
              <label htmlFor="origin">Origin Location</label>

              <input
                type="text"
                id="origin"
                name="origin"
                placeholder="Enter farm location"
                value={formData.origin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="registration-form-group">
              <label htmlFor="productionDate">Production Date</label>

              <input
                type="date"
                id="productionDate"
                name="productionDate"
                value={formData.productionDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="registration-form-group">
              <label htmlFor="quantity">Quantity</label>

              <input
                type="number"
                id="quantity"
                name="quantity"
                placeholder="Enter quantity"
                min="0.01"
                step="any"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="registration-form-group">
            <label htmlFor="batchNumber">Batch Number</label>

            <input
              type="text"
              id="batchNumber"
              name="batchNumber"
              placeholder="Enter batch number"
              value={formData.batchNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="registration-form-group">
            <label htmlFor="description">Product Description</label>

            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Enter additional product details"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="registration-actions">
            <button
              type="submit"
              className="register-product-button"
              disabled={loading || !canRegister}
            >
              {loading ? 'Registering...' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterProduct;
