from flask import Flask, render_template, request, jsonify
from parser import DrugDataProvider

app = Flask(__name__)
data_provider = DrugDataProvider()

@app.route('/')
def index():
    """Render the main single-page application."""
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search():
    """API Endpoint to search for drug information."""
    query = request.args.get('q', '').strip()

    if not query:
        return jsonify({
            "success": False, 
            "error": "Please enter a valid drug name.", 
            "results": []
        }), 400

    try:
        results = data_provider.search_drug(query)
        return jsonify({
            "success": True,
            "results": results
        }), 200
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": "An internal server error occurred while parsing data.", 
            "results": []
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)