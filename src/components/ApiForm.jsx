import React, { useState } from 'react';
import './ApiForm.css';

const ApiForm = () => {
  const [formData, setFormData] = useState({
    apiKey: '',
    endpoint: '',
    input: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="apiKey">API Key:</label>
          <input
            type="text"
            id="apiKey"
            name="apiKey"
            value={formData.apiKey}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endpoint">Endpoint:</label>
          <input
            type="text"
            id="endpoint"
            name="endpoint"
            value={formData.endpoint}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="input">Input:</label>
          <textarea
            id="input"
            name="input"
            value={formData.input}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default ApiForm;