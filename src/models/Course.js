/**
 * Course Model Class
 * Ensures consistent course data structure across the application
 */
class Course {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.category = data.category || null;
    this.code = data.code || '';
    this.description = data.description || '';
    this.teacher = data.teacher || null;
    this.block = data.block || null;
    
    // Post-specific properties (for courses in posts)
    this.needs_help = data.needs_help || false;
    this.is_experienced = data.is_experienced || false;
    
    // Statistics
    this.experienced_count = data.experienced_count || 0;
    
    // Any additional fields from API
    this._rawData = data;
  }

  /**
   * Check if this is a valid course with required data
   */
  isValid() {
    return this.id !== null && this.name !== '';
  }

  /**
   * Get display name (name or code, whichever is available)
   */
  getDisplayName() {
    return this.name || this.code || 'Unknown Course';
  }

  /**
   * Check if course matches a search query
   */
  matchesSearch(query) {
    if (!query) return true;
    
    const searchLower = query.toLowerCase();
    return (
      this.name.toLowerCase().includes(searchLower) ||
      this.code.toLowerCase().includes(searchLower) ||
      (this.category && this.category.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Create Course instance from API response
   */
  static fromAPI(data) {
    return new Course(data);
  }

  /**
   * Create multiple Course instances from API array
   */
  static fromAPIArray(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(data => Course.fromAPI(data));
  }

  /**
   * Convert to plain object for API requests
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      code: this.code,
      description: this.description,
      teacher: this.teacher,
      block: this.block,
      needs_help: this.needs_help,
      is_experienced: this.is_experienced,
      experienced_count: this.experienced_count,
    };
  }

  /**
   * Compare two courses for equality
   */
  equals(otherCourse) {
    if (!otherCourse) return false;
    return this.id === otherCourse.id;
  }

  /**
   * Create a copy of this course
   */
  clone() {
    return new Course(this._rawData);
  }
}

export default Course;
